# Enterprise Search

## Overview

This plugin's goal is to provide a Kibana user interface to the Enterprise Search solution's products (App Search and Workplace Search). In its current MVP state, the plugin provides a basic engines overview from App Search with the goal of gathering user feedback and raising product awareness.

## Development

1. When developing locally, Enterprise Search should be running locally alongside Kibana on `localhost:3002`.
2. Update `config/kibana.dev.yml` with `enterpriseSearch.host: 'http://localhost:3002'`
3. For faster QA/development, run Enterprise Search on `elasticsearch-native` auth and log in as the `elastic` superuser on Kibana.

## Testing

### Unit tests

From `kibana-root-folder/x-pack`, run:

```bash
yarn test:jest plugins/enterprise_search
```

### E2E tests

See [our functional test runner README](../../test/functional_enterprise_search).
