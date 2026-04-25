# Kibana Platform Serverless Tests

The tests and helper methods (services, page objects) defined here in
`x-pack/platform/test/serverless` cover the platform-shared serverless functionality that works across all serverless project types (Security, Observability, Search, Workplace AI).

**Important**: Only tests that validate platform-shared functionality should be located here. Solution-specific serverless tests should be located in their respective solution directories: `x-pack/solutions/<solution>/test/serverless`.

For instructions on how to set up Docker for serverless ES images, please refer to
[src/platform/packages/shared/kbn-es/README](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-es/README.mdx).
[src/platform/packages/shared/kbn-es/README](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-es/README.mdx).

## Platform Serverless Testing Structure and Conventions

### Overview

The platform serverless test structure focuses on functionality that is shared across all serverless project types. This includes core platform features, shared UX components, and common serverless behaviors that are not specific to any particular solution.

Tests are organized in `api_integration` and `functional` directories with their respective helper methods and services.

The `shared` directory contains fixtures, services, and utilities that are shared across
`api_integration` and `functional` tests.

```
x-pack/platform/test/serverless/
├─ api_integration
│  ├─ configs
│  ├─ services
│  ├─ test_suites
│  │  ├─ # Platform-shared API functionality
├─ functional
│  ├─ configs
│  ├─ page_objects
│  ├─ services
│  ├─ test_suites
│  │  ├─ # Platform-shared UI functionality
├─ shared
│  ├─ services
│  ├─ types
```

### Solution-Specific Tests

Tests that are specific to individual serverless project types should be located in their respective solution directories:

- **Security Solution**: `x-pack/solutions/security/test/serverless/`
- **Observability Solution**: `x-pack/solutions/observability/test/serverless/`
- **Search Solution**: `x-pack/solutions/search/test/serverless/`
- **Other Solutions**: `x-pack/solutions/<solution>/test/serverless/`

**Guidelines for platform tests**:

- Focus on functionality that works identically across all project types
- Test core platform features (spaces, saved objects, user management, alerting, etc.)
- Validate shared UI components and navigation patterns
- Ensure consistent behavior across different serverless project types

**What should NOT be included**:

- Solution-specific features or APIs
- Project-type specific UI elements or workflows
- Business logic specific to Security, Observability, Search, or Chat solutions

### Shared Services and Page Objects

Test services and page objects from `x-pack/platform/test/[api_integration|functional]`
are available for reuse.

Platform serverless-specific services and page objects are implemented in
`x-pack/platform/test/serverless/[api_integration|functional|shared]` only.

**Naming conventions for helper methods**:

| scope    | namespace for helper methods |
| -------- | ---------------------------- |
| platform | svlCommon                    |

**Note**: Solution-specific helper methods should be implemented in their respective solution test directories and use solution-specific namespaces.

### Adding Platform Serverless Tests

Platform serverless tests should only be added when testing functionality that is truly shared across all serverless project types. All tests that should run in a serverless environment but are solution-specific should be added to the respective solution directories: `x-pack/solutions/<solution>/test/serverless/`.

**Before adding tests here, ask yourself**:

- Does this functionality work identically across all serverless project types?
- Is this a core platform feature rather than solution-specific logic?
- Would this test provide value when run against any serverless project type?

### Roles-based testing

Each serverless project has its own set of SAML roles with [specfic permissions defined in roles.yml](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-es/src/serverless_resources/project_roles)
and in order to properly test Kibana functionality, test design requires to login with
a project-supported SAML role. FTR provides `samlAuth` service to do SAML authentication, that allows UI tests to set
the SAML cookie in the browser context and generates api key to use in the api integration tests. See examples below.

General recommendations:

- use the minimal required role to access tested functionality
- when feature logic depends on both project type & role, make sure to add separate tests
- avoid using basic authentication, unless it is the actual test case
- run the tests against real project(s) on MKI to validate it is stable

#### Functional UI test example

Recommendations:

- in each test file top level `describe` suite should start with `loginWithRole` call in `before` hook
- no need to log out, you can change role by calling `loginWithRole` again.
- for the common tests you can use `loginWithPrivilegedRole` to login as Editor/Developer

```ts
describe("my test suite", async function() {
  before(async () => {
    await PageObjects.svlCommonPage.loginWithRole('viewer');
    await esArchiver.load(...);
    await PageObjects.dashboard.navigateToApp();
  });

  it('test step', async() => {
    await PageObjects.dashboard.loadSavedDashboard('old dashboard');
    await PageObjects.dashboard.waitForRenderComplete();
    ...
  });
});
```

#### API integration test example

API Authentication in Kibana: Public vs. Internal APIs

Kibana provides both public and internal APIs, each requiring authentication with the correct privileges. However, the method of testing these APIs varies, depending on how they are utilized by end users.

- Public APIs: When testing HTTP requests to public APIs, API key-based authentication should be used. It reflects how an end user calls these APIs. Due to existing restrictions, we utilize `Admin` user credentials to generate API keys for various roles. While the API key permissions are correctly scoped according to the assigned role, the user will internally be recognized as `Admin` during authentication.

- Internal APIs: Direct HTTP requests to internal APIs are generally not expected. However, for testing purposes, authentication should be performed using the Cookie header. This approach simulates client-side behavior during browser interactions, mirroring how internal APIs are indirectly invoked.

Recommendations:

- use `roleScopedSupertest` service to create a supertest instance scoped to a specific role and predefined request headers
- `roleScopedSupertest.getSupertestWithRoleScope(<role>)` authenticates requests with an API key by default
- pass `useCookieHeader: true` to use Cookie header for request authentication
- don't forget to invalidate API keys by using `destroy()` on the supertest scoped instance in the `after` hook

```ts
describe("my public APIs test suite", async function() {
    before(async () => {
      supertestViewerWithApiKey =
        await roleScopedSupertest.getSupertestWithRoleScope('viewer', {
          withInternalHeaders: true,
        });
    });

    after(async () => {
      await supertestViewerWithApiKey.destroy();
    });

    it('test step', async () => {
      const { body, status } = await supertestViewerWithApiKey
        .delete('/api/spaces/space/default')
      ...
    });
});
```

```ts
describe("my internal APIs test suite", async function() {
    before(async () => {
      supertestViewerWithCookieCredentials =
        await roleScopedSupertest.getSupertestWithRoleScope('admin', {
          useCookieHeader: true, // to avoid generating API key and use Cookie header instead
          withInternalHeaders: true,
        });
    });

    after(async () => {
      // no need to call '.destroy' since we didn't create API key and Cookie persist for the role within FTR run
    });

    it('test step', async () => {
      await supertestAdminWithCookieCredentials
        .post(`/internal/kibana/settings`)
        .send({ changes: { [TEST_SETTING]: 500 } })
        .expect(200);
      ...
    });
});
```

#### Testing with custom roles

With custom native roles now enabled for Security, Search, and Observability projects on MKI, FTR supports
defining and authenticating with custom roles in both UI functional and API integration tests.

To test custom roles on a project type that doesn't yet support them, use a feature flags test config ([example](./functional/test_suites/data_usage/privileges.ts)). This allows testing in the Kibana CI before the feature is enabled on MKI. Once the project type officially supports custom roles, move the tests to a standard FTR config to enable execution on MKI.

When running tests locally against MKI, ensure that the `.ftr/role_users.json` file includes the reserved role name `custom_role_worker_1` along with its credentials. This role name has been updated for compatibility with Scout, which supports parallel test execution and allows multiple credential pairs to be passed.

```json
{
  "viewer": {
    "email": "...",
    "password": "..."
  },
  ...
  "custom_role_worker_1": {
    "email": "...",
    "password": "..."
  }
}
```

When using QAF to create a project with a custom native role, ensure that the role name `custom_role_worker_1` is configured as a Kibana role. While the test user is automatically assigned to the custom role, you must update the role's privileges before performing actions such as logging in via the browser, generating a cookie header, or creating an API key within each test suite.

FTR UI test example:

```ts
// First, set privileges for the custom role
await samlAuth.setCustomRole({
  elasticsearch: {
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
});

// Then, log in via the browser as a user with the newly defined privileges
await pageObjects.svlCommonPage.loginWithCustomRole();

// Make sure to delete the custom role in the 'after' hook
await samlAuth.deleteCustomRole();
```

FTR api_integration test example:

```ts
// First, set privileges for the custom role
await samlAuth.setCustomRole({
  elasticsearch: {
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      feature: {
        discover: ['read'],
      },
      spaces: ['*'],
    },
  ],
});

// Then, generate an API key with the newly defined privileges
const roleAuthc = await samlAuth.createM2mApiKeyWithCustomRoleScope();

// Remember to invalidate the API key after use and delete the custom role
await samlAuth.invalidateM2mApiKeyWithRoleScope(roleAuthc);
await samlAuth.deleteCustomRole();
```

### Testing with feature flags

**tl;dr:** Tests specific to functionality behind a feature flag need special
handling and are by default only tested locally / in CI but excluded from regular
test runs in MKI.

New features might be gated behind a feature flag and can only be enabled
through a yml configuration entry. By default, these features are not enabled
so they're not available in a regular serverless MKI project, which would make
end-to-end tests for such a feature fail. In order to still have tests for
features behind a feature flag, these tests need to be separated from the
regular tests.

For every project's `test_suites` directory, there are feature flags specific
config (`config.feature_flags.ts`) and index (`index.feature_flags.ts`) files
next to the regular `config.ts` and `index.ts`. These extra files are used to
cover all feature flag tests of the respective area.
If you want to add feature flag specific tests:

- Add your feature flag(s) to the `kbnServerArgs` in the `config.feature_flags.ts` file
- Load your test file(s) in the `index.feature_flags.ts` file

As mentioned above, these tests are not part of the regular test run against MKI
projects. If you still want to run feature flag tests against an MKI project,
this requires a Kibana Docker build that has the feature flags enabled by default.
This Docker image can then be used to create a project in serverless QA and the
feature flags tests can be pointed to the project.

## Run tests

Similar to how functional tests are run in other directories, you can point the
functional tests server and test runner to config files in this `x-pack/platform/test/serverless/[api_integration|functional]/configs`
directory, e.g. from the `x-pack` directory run:

```bash
node scripts/functional_tests_server.js --config x-pack/platform/test/serverless/api_integration/configs/search/config.group1.ts

node scripts/functional_test_runner.js --config x-pack/platform/test/serverless/api_integration/configs/search/config.group1.ts
```

## Run tests on MKI

There is no need to start servers locally, you just need to create MKI project and copy urls for Elasticsearch and Kibana. Make sure to update urls with username/password and port 443 for Elasticsearch. FTR has no control over MKI and can't update your projects so make sure your `config.ts` does not specify any custom arguments for Kibana or Elasticsearch. Otherwise, it will be ignored. You can run the tests from the `x-pack` directory:

```bash
TEST_CLOUD=1 TEST_CLOUD_HOST_NAME="CLOUD_HOST_NAME" TEST_ES_URL="https://elastic:PASSWORD@ES_HOSTNAME:443" TEST_KIBANA_URL="https://elastic:PASSWORD@KIBANA_HOSTNAME" node scripts/functional_test_runner --config x-pack/platform/test/serverless/api_integration/configs/search/config.group1.ts --exclude-tag=skipMKI
```

Steps to follow to run on QA environment:

- Go to `CLOUD_HOST_NAME` and create a project.
- Go to `CLOUD_HOST_NAME/account/keys` and create Cloud specific API Key.
- We need the key from step 2 to obtain basic auth credentials for ES and Kibana.
  Make a POST request to the following endpoint.

  ```
  POST CLOUD_HOST_NAME/api/v1/serverless/projects/<project-type>/<project-id>/_reset-internal-credentials
  Authorization: ApiKey <Cloud-API-key>
  Content-Type: application/json
  ```

  In response you should get credentials.

  ```json
  {
    "password": "testing-internal_pwd",
    "username": "testing-internal"
  }
  ```

  We would use these credentials for `TEST_ES_URL="https://USERNAME:PASSWORD@ES_HOSTNAME:443"` and `TEST_KIBANA_URL="https://USERNAME:PASSWORD@KIBANA_HOSTNAME"`

- Now we need to create a user with the roles we want to test. Go to members page - `CLOUD_HOST_NAME/account/members` and click `[Invite member]`.
  - Select the access level you want to grant and your project type. For example, to create a user with viewer role, toggle `[Instance access]`, select project (should correspond to your project type, i.e Security), select `Viewer` role.
  - Create `.ftr/role_users.json` in the root of Kibana repo. Add record for created user.
    ```json
    {
      "viewer": {
        "password": "xxxx",
        "email": "email_of_the_elastic_cloud_account"
      }
    }
    ```
- Now run the tests from the `x-pack` directory

```bash
TEST_CLOUD=1 TEST_CLOUD_HOST_NAME="CLOUD_HOST_NAME" TEST_ES_URL="https://testing-internal:testing-internal_pwd@ES_HOSTNAME:443" TEST_KIBANA_URL="https://testing-internal:testing-internal_pwd@KIBANA_HOSTNAME:443" node scripts/functional_test_runner.js --config x-pack/platform/test/serverless/api_integration/configs/search/config.group1.ts --exclude-tag=skipMKI
```

## Skipping tests for MKI run

The tests that are listed in the regular `config.ts` generally should work in both Kibana CI and MKI. However some tests might not work properly against MKI projects by design.
Tag the tests with `skipMKI` to be excluded for MKI run. It works only for the `describe` block:

```ts
describe("my test suite", async function() {
    this.tags(['skipMKI']);
    ...
});
```

If you are running tests from your local against MKI projects, make sure to add `--exclude-tag=skipMKI` to your FTR command.

## Run tests with dockerized package registry

For tests using package registry we have enabled a configuration that uses a dockerized lite version to execute the tests in the CI, this will reduce the flakiness of them when calling the real endpoint.

To be able to run this version locally you must have a Docker daemon running in your system and set `FLEET_PACKAGE_REGISTRY_PORT` env var. In order to set this variable execute

```bash
export set FLEET_PACKAGE_REGISTRY_PORT=12345
```

To unset the variable, and run the tests against the real endpoint again, execute

```bash
unset FLEET_PACKAGE_REGISTRY_PORT
```
