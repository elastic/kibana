# Kibana Screenshotting

This plugin provides functionality to take screenshots of the Kibana pages.
It uses Chromium and Puppeteer underneath to run the browser in headless mode.

## API

The plugin exposes most of the functionality in the start contract.
The Chromium download and setup is happening during the setup stage.

To learn more about the public API, please use automatically generated API reference or generated TypeDoc comments.

## Testing Chromium downloads

To download all Chromium browsers for all platforms and architectures:

```
cd x-pack
npx gulp downloadChromium
```

This command is used to provision CI workspaces so that Chromium does not need to be downloaded for every CI run.
