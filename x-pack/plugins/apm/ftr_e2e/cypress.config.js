const { defineConfig } = require('cypress')

module.exports = defineConfig({
  fileServerFolder: './cypress',
  fixturesFolder: './cypress/fixtures',
  screenshotsFolder: './cypress/screenshots',
  videosFolder: './cypress/videos',
  requestTimeout: 10000,
  responseTimeout: 40000,
  defaultCommandTimeout: 30000,
  execTimeout: 120000,
  pageLoadTimeout: 120000,
  viewportHeight: 900,
  viewportWidth: 1440,
  video: false,
  screenshotOnRunFailure: false,
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      return require('./cypress/plugins/index.ts')(on, config)
    },
    specPattern: './cypress/integration/**/*.cy.{js,jsx,ts,tsx}',
    experimentalSessionAndOrigin: true,
  },
})
