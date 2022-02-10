/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCommands } from './get_commands';

describe('getCommands', () => {
  describe('unknown agent', () => {
    it('renders empty command', () => {
      const commands = getCommands({
        variantId: 'foo',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).toBe('');
    });
  });
  describe('java agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'java',
        policyDetails: {},
      });
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls= \\\\
        -Delastic.apm.secret_token= \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'java',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.service_name=my-application \\\\
        -Delastic.apm.server_urls=localhost:8220 \\\\
        -Delastic.apm.secret_token=foobar \\\\
        -Delastic.apm.environment=production \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-application.jar"
      `);
    });
  });
  describe('RUM(js) agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'js',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "import { init as initApm } from '@elastic/apm-rum'
        var apm = initApm({

          // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
          serviceName: 'your-app-name',

          // Set custom APM Server URL (default: http://localhost:8200)
          serverUrl: '',

          // Set the service version (required for source map feature)
          serviceVersion: '',

          // Set the service environment
          environment: 'production'
        })"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'js',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "import { init as initApm } from '@elastic/apm-rum'
        var apm = initApm({

          // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
          serviceName: 'your-app-name',

          // Set custom APM Server URL (default: http://localhost:8200)
          serverUrl: 'localhost:8220',

          // Set the service version (required for source map feature)
          serviceVersion: '',

          // Set the service environment
          environment: 'production'
        })"
      `);
    });
  });
  describe('Node.js agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'node',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the VERY top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({

        // Override the service name from package.json
        // Allowed characters: a-z, A-Z, 0-9, -, _, and space
        serviceName: '',

        // Use if APM Server requires a secret token
        secretToken: '',

        // Set the custom APM Server URL (default: http://localhost:8200)
        serverUrl: '',

        // Set the service environment
        environment: 'production'
        })"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'node',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the VERY top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({

        // Override the service name from package.json
        // Allowed characters: a-z, A-Z, 0-9, -, _, and space
        serviceName: '',

        // Use if APM Server requires a secret token
        secretToken: 'foobar',

        // Set the custom APM Server URL (default: http://localhost:8200)
        serverUrl: 'localhost:8220',

        // Set the service environment
        environment: 'production'
        })"
      `);
    });
  });
  describe('Django agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'django',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Add the agent to the installed apps
        INSTALLED_APPS = (
        'elasticapm.contrib.django',
        # ...
        )

        ELASTIC_APM = {
        # Set the required service name. Allowed characters:
        # a-z, A-Z, 0-9, -, _, and space
        'SERVICE_NAME': '',

        # Use if APM Server requires a secret token
        'SECRET_TOKEN': '',

        # Set the custom APM Server URL (default: http://localhost:8200)
        'SERVER_URL': '',

        # Set the service environment
        'ENVIRONMENT': 'production',
        }

        # To send performance metrics, add our tracing middleware:
        MIDDLEWARE = (
        'elasticapm.contrib.django.middleware.TracingMiddleware',
        #...
        )"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'django',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Add the agent to the installed apps
        INSTALLED_APPS = (
        'elasticapm.contrib.django',
        # ...
        )

        ELASTIC_APM = {
        # Set the required service name. Allowed characters:
        # a-z, A-Z, 0-9, -, _, and space
        'SERVICE_NAME': '',

        # Use if APM Server requires a secret token
        'SECRET_TOKEN': 'foobar',

        # Set the custom APM Server URL (default: http://localhost:8200)
        'SERVER_URL': 'localhost:8220',

        # Set the service environment
        'ENVIRONMENT': 'production',
        }

        # To send performance metrics, add our tracing middleware:
        MIDDLEWARE = (
        'elasticapm.contrib.django.middleware.TracingMiddleware',
        #...
        )"
      `);
    });
  });
  describe('Flask agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'flask',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# initialize using environment variables
        from elasticapm.contrib.flask import ElasticAPM
        app = Flask(__name__)
        apm = ElasticAPM(app)

        # or configure to use ELASTIC_APM in your application's settings
        from elasticapm.contrib.flask import ElasticAPM
        app.config['ELASTIC_APM'] = {
        # Set the required service name. Allowed characters:
        # a-z, A-Z, 0-9, -, _, and space
        'SERVICE_NAME': '',

        # Use if APM Server requires a secret token
        'SECRET_TOKEN': '',

        # Set the custom APM Server URL (default: http://localhost:8200)
        'SERVER_URL': '',

        # Set the service environment
        'ENVIRONMENT': 'production',
        }

        apm = ElasticAPM(app)"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'flask',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# initialize using environment variables
        from elasticapm.contrib.flask import ElasticAPM
        app = Flask(__name__)
        apm = ElasticAPM(app)

        # or configure to use ELASTIC_APM in your application's settings
        from elasticapm.contrib.flask import ElasticAPM
        app.config['ELASTIC_APM'] = {
        # Set the required service name. Allowed characters:
        # a-z, A-Z, 0-9, -, _, and space
        'SERVICE_NAME': '',

        # Use if APM Server requires a secret token
        'SECRET_TOKEN': 'foobar',

        # Set the custom APM Server URL (default: http://localhost:8200)
        'SERVER_URL': 'localhost:8220',

        # Set the service environment
        'ENVIRONMENT': 'production',
        }

        apm = ElasticAPM(app)"
      `);
    });
  });
  describe('Ruby on Rails agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'rails',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rails app
        service_name: 'my-service'

        # Use if APM Server requires a secret token
        secret_token: ''

        # Set the custom APM Server URL (default: http://localhost:8200)
        server_url: ''

        # Set the service environment
        environment: 'production'"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'rails',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rails app
        service_name: 'my-service'

        # Use if APM Server requires a secret token
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200)
        server_url: 'localhost:8220'

        # Set the service environment
        environment: 'production'"
      `);
    });
  });
  describe('Rack agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'rack',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rack app's class.
        service_name: 'my-service'

        # Use if APM Server requires a token
        secret_token: ''

        # Set custom APM Server URL (default: http://localhost:8200)
        server_url: '',

        # Set the service environment
        environment: 'production'"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'rack',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rack app's class.
        service_name: 'my-service'

        # Use if APM Server requires a token
        secret_token: 'foobar'

        # Set custom APM Server URL (default: http://localhost:8200)
        server_url: 'localhost:8220',

        # Set the service environment
        environment: 'production'"
      `);
    });
  });
  describe('Go agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'go',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.
        # If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.
        export ELASTIC_APM_SERVICE_NAME=

        # Set custom APM Server URL (default: http://localhost:8200)
        export ELASTIC_APM_SERVER_URL=

        # Use if APM Server requires a secret token
        export ELASTIC_APM_SECRET_TOKEN=

        # Set the service environment
        export ELASTIC_APM_ENVIRONMENT=
        "
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'go',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.
        # If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.
        export ELASTIC_APM_SERVICE_NAME=

        # Set custom APM Server URL (default: http://localhost:8200)
        export ELASTIC_APM_SERVER_URL=localhost:8220

        # Use if APM Server requires a secret token
        export ELASTIC_APM_SECRET_TOKEN=foobar

        # Set the service environment
        export ELASTIC_APM_ENVIRONMENT=
        "
      `);
    });
  });
  describe('dotNet agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'dotnet',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
        \\"ElasticApm\\": {
        \\"SecretToken\\": \\"\\",
        \\"ServerUrls\\": \\"\\", //Set custom APM Server URL (default: http://localhost:8200)
        \\"ServiceName\\": \\"MyApp\\", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
        \\"Environment\\": \\"production\\", // Set the service environment
        }
        }"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'dotnet',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
        \\"ElasticApm\\": {
        \\"SecretToken\\": \\"foobar\\",
        \\"ServerUrls\\": \\"localhost:8220\\", //Set custom APM Server URL (default: http://localhost:8200)
        \\"ServiceName\\": \\"MyApp\\", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
        \\"Environment\\": \\"production\\", // Set the service environment
        }
        }"
      `);
    });
  });
  describe('PHP agent', () => {
    it('renders empty commands', () => {
      const commands = getCommands({
        variantId: 'php',
        policyDetails: {},
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "elastic_apm.server_url=\\"\\"
        elastic.apm.secret_token=\\"\\"
        elastic_apm.service_name=\\"My service\\"
        "
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getCommands({
        variantId: 'php',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "elastic_apm.server_url=\\"localhost:8220\\"
        elastic.apm.secret_token=\\"foobar\\"
        elastic_apm.service_name=\\"My service\\"
        "
      `);
    });
  });
});
