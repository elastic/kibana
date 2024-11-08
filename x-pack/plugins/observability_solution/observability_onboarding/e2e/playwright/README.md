# Observability Onboarding Playwright Tests

These tests are part of the [Nightly CI workflow](https://github.com/elastic/ensemble/actions/workflows/nightly.yml) and do not run on PRs.

Playwright tests are only responsible for UI checks and do not automate onboarding flows fully. On the CI, the missing parts (like executing code snippets on the host) are automated by Ensemble stories, but when running locally you need to do those steps manually.

## Running The Tests Locally

1. Run ES and Kibana
2. Review default values in the `./env` file. If needed, create `./env.local` or similar with adjusted values that work for your local setup.
3. Run the `playwright test`
```bash
# Assuming the working directory is the root of the Kibana repo
npx playwright test -c ./x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/playwright.config.ts --project stateful --reporter list --headed

# Or if you have a custom env file
DOTENV_PATH=./x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/.env.local npx playwright test -c ./x-pack/plugins/observability_solution/observability_onboarding/e2e/playwright/playwright.config.ts --project stateful --reporter list --headed
```
4. Once the test reaches one of the required manual steps, like executing auto-detect command snippet, do the step manually.
5. The test will proceed once the manual step is done.
