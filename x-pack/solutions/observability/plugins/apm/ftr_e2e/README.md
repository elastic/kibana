# APM E2E

APM uses [FTR](../../../../../../packages/kbn-test/README.mdx) (functional test runner) and [Cypress](https://www.cypress.io/) to run the e2e tests. The tests are located at `kibana/x-pack/solutions/observability/plugins/apm/ftr_e2e/cypress/e2e`.

## Tips and best practices

### Don't `await` Cypress methods

Given this backend task:

```ts
// plugins.ts
const plugin: Cypress.PluginConfig = (on, config) => {
  on('task', {
    async waitForMe(ms: number) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(null), ms);
      });
    }
  }
};
```

**WRONG**

Intuitively an async task should be `await`'ed.

```ts
// feature.spec.ts
beforeEach(async () => {
  await cy.task('waitForMe', 150);
});
```

**CORRECT**

However, the correct approach is to simply call it and let Cypress queue the task

```ts
// feature.spec.ts
beforeEach(() => {
  cy.task('waitForMe', 150);
});
```

See [Cypress Docs](https://docs.cypress.io/api/commands/task#Return-a-Promise-from-an-asynchronous-task) for details

### Setup intercepts before opening the page

It is important that interceptors are setup before opening the page that fires the requests that are intercepted. If the interceptors are setup after the requests were made, they will not be captured and the test will timeout during `cy.wait`,

**WRONG**

```ts
it('calls the dependencies API', () => {
  cy.visit('/app/apm/services');
  cy.intercept('GET', '/internal/apm/dependencies/top').as('topDependencies');
  cy.wait('@topDependencies');
});
```

**Correct**

```ts
it('calls the dependencies API', () => {
  cy.intercept('GET', '/internal/apm/dependencies/top').as('topDependencies');
  cy.visit('/app/apm/services');
  cy.wait('@topDependencies');
});
```

### Prefer `cy.visitKibana` instead of `cy.visit`

In most cases we should use [`cy.visitKibana`](https://github.com/elastic/kibana/blob/f0eb5d695745f1f3a19ae6392618d1826ce29ce2/x-pack/solutions/observability/plugins/apm/ftr_e2e/cypress/support/commands.ts#L96-L108) instead of `cy.visit`.
`cy.visitKibana` will wait for Kibana to have successfully loaded before moving on. This will reduce the risk of timing out later in the test because we split up the wait time in two parts: Kibana load time, and APM load time thus a time budget for each (by default 40 seconds).

### Clean data before and after each test

Some times test can stop in the middle of the execution and start running again, making sure that, if there were some data created, is properly cleaned before starting the test again will guarantee the proper execution of the test.

**WRONG**

The following will create a custom link during the test, and delete it after the test. This can lead to an invalid state if the test is stopped halfway through.

```ts
describe('Custom links', () => {
  // we check that there are not links created
  it('shows empty message and create button', () => {
    cy.visitKibana(basePath);
    cy.contains('No links found');
    cy.contains('Create custom link');
  });

  it('creates custom link', () => {
    cy.contains('Create custom link').click();
    cy.get('input[name="label"]').type('foo');
    cy.contains('Save').click();
    cy.contains('foo');
    // if the test stops before the delete and starts again, the previous test will fail
    cy.contains('Delete').click();
  });
});
```

**CORRECT**

The correct approach is to clean up data before running the tests, preferably via api calls (as opposed to clicking the ui).

```ts
describe('Custom links', () => {
  beforeEach(() => {
    cy.request({
      log: false,
      method: 'DELETE',
      url: `${kibanaUrl}/internal/apm/settings/custom_links/link.id`,
      body: {},
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
      auth: { user: 'editor', pass: '****' },
    });
  });

  it('shows empty message and create button', () => {
    cy.visitKibana(basePath);
    cy.contains('No links found');
    cy.contains('Create custom link');
  });

  it('creates custom link', () => {
    cy.contains('Create custom link').click();
    cy.get('input[name="label"]').type('foo');
    cy.contains('Save').click();
    cy.contains('foo');
    cy.contains('Delete').click();
  });
});
```

Use `synthtrace.clean()` after each test suit

```ts
describe('when data is loaded', () => {
    before(() => {
      synthtrace.index(
        generateData({
          from: new Date(start).getTime(),
          to: new Date(end).getTime(),
        })
      );
    });

    after(() => {
      synthtrace.clean();
    });

    it(...)
});
```

## Running tests

Go to [tests documentation](../dev_docs/testing.md#e2e-tests-cypress)
