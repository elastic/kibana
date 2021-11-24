# Session View

Welcome to the Kibana Security Solution plugin! This README will go over getting started with development and testing.

## Development

## Tests

### Unit tests

From kibana path in your terminal go to this plugin root:

```bash
cd x-pack/plugins/session_view
```

Then run jest with:

```bash
yarn test:jest
```

Or if running from kibana root, you can specify the `-i` to specify the path:

```bash
yarn test:jest -i x-pack/plugins/session_view/
```
