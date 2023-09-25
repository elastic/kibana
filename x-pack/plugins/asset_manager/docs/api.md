# Asset Manager API Documentation

## Alpha Configuration

This plugin is NOT fully enabled by default, even though it's always enabled
by Kibana's definition of "enabled". However, without the following configuration,
it will bail before it sets up any routes or returns anything from its
start, setup, or stop hooks.

To fully enable the plugin, set the following config values in your kibana.yml file:

```yaml
xpack.assetManager:
  alphaEnabled: true
```

## APIs

This plugin provides the following APIs.

### Server Assets Client

TBD

### Public Assets Client

TBD
