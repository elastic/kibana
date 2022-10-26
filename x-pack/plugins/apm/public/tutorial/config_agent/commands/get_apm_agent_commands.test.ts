/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmAgentCommands } from './get_apm_agent_commands';

describe('getCommands', () => {
  const defaultValues = {
    apmServiceName: 'my-service-name',
    apmEnvironment: 'my-environment',
  };
  describe('unknown agent', () => {
    it('renders empty command', () => {
      const commands = getApmAgentCommands({
        variantId: 'foo',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).toBe('');
    });
  });
  describe('java agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'java',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.service_name=my-service-name \\\\
        -Delastic.apm.secret_token= \\\\
        -Delastic.apm.server_url= \\\\
        -Delastic.apm.environment=my-environment \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-service-name.jar"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'java',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.service_name=my-service-name \\\\
        -Delastic.apm.secret_token=foobar \\\\
        -Delastic.apm.server_url=localhost:8220 \\\\
        -Delastic.apm.environment=my-environment \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-service-name.jar"
      `);
    });
  });
  describe('RUM(js) agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'js',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "import { init as initApm } from '@elastic/apm-rum'
        var apm = initApm({

          // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
          serviceName: 'my-service-name',

          // Set custom APM Server URL (default: http://localhost:8200)
          serverUrl: '',

          // Set the service version (required for source map feature)
          serviceVersion: '',

          // Set the service environment
          environment: 'my-environment'
        })"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'js',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "import { init as initApm } from '@elastic/apm-rum'
        var apm = initApm({

          // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
          serviceName: 'my-service-name',

          // Set custom APM Server URL (default: http://localhost:8200)
          serverUrl: 'localhost:8220',

          // Set the service version (required for source map feature)
          serviceVersion: '',

          // Set the service environment
          environment: 'my-environment'
        })"
      `);
    });
  });
  describe('Node.js agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'node',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the VERY top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({

          // Override the service name from package.json
          // Allowed characters: a-z, A-Z, 0-9, -, _, and space
          serviceName: 'my-service-name',

          // Use if APM Server requires a secret token
          secretToken: '',

          // Set the custom APM Server URL (default: http://localhost:8200)
          serverUrl: '',

          // Set the service environment
          environment: 'my-environment'
        })"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'node',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the VERY top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({

          // Override the service name from package.json
          // Allowed characters: a-z, A-Z, 0-9, -, _, and space
          serviceName: 'my-service-name',

          // Use if APM Server requires a secret token
          secretToken: 'foobar',

          // Set the custom APM Server URL (default: http://localhost:8200)
          serverUrl: 'localhost:8220',

          // Set the service environment
          environment: 'my-environment'
        })"
      `);
    });
  });
  describe('Django agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'django',
        policyDetails: {},
        defaultValues,
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
          #'SERVICE_NAME': 'my-service-name',

          # Use if APM Server requires a secret token
          'SECRET_TOKEN': '',

          # Set the custom APM Server URL (default: http://localhost:8200)
          'SERVER_URL': '',

          # Set the service environment
          'ENVIRONMENT': 'my-environment',
        }

        # To send performance metrics, add our tracing middleware:
        MIDDLEWARE = (
          'elasticapm.contrib.django.middleware.TracingMiddleware',
          #...
        )"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'django',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
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
          #'SERVICE_NAME': 'my-service-name',

          # Use if APM Server requires a secret token
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200)
          'SERVER_URL': 'localhost:8220',

          # Set the service environment
          'ENVIRONMENT': 'my-environment',
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
      const commands = getApmAgentCommands({
        variantId: 'flask',
        policyDetails: {},
        defaultValues,
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
          #'SERVICE_NAME': 'my-service-name',

          # Use if APM Server requires a secret token
          'SECRET_TOKEN': '',

          # Set the custom APM Server URL (default: http://localhost:8200)
          'SERVER_URL': '',

          # Set the service environment
          'ENVIRONMENT': 'my-environment',
        }

        apm = ElasticAPM(app)"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'flask',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
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
          #'SERVICE_NAME': 'my-service-name',

          # Use if APM Server requires a secret token
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200)
          'SERVER_URL': 'localhost:8220',

          # Set the service environment
          'ENVIRONMENT': 'my-environment',
        }

        apm = ElasticAPM(app)"
      `);
    });
  });
  describe('Ruby on Rails agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'rails',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rails app
        service_name: 'my-service-name'

        # Use if APM Server requires a secret token
        secret_token: ''

        # Set the custom APM Server URL (default: http://localhost:8200)
        server_url: ''

        # Set the service environment
        environment: 'my-environment'"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'rails',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rails app
        service_name: 'my-service-name'

        # Use if APM Server requires a secret token
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200)
        server_url: 'localhost:8220'

        # Set the service environment
        environment: 'my-environment'"
      `);
    });
  });
  describe('Rack agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'rack',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rack app's class.
        service_name: 'my-service-name'

        # Use if APM Server requires a token
        secret_token: ''

        # Set custom APM Server URL (default: http://localhost:8200)
        server_url: '',

        # Set the service environment
        environment: 'my-environment'"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'rack',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Set the service name - allowed characters: a-z, A-Z, 0-9, -, _ and space
        # Defaults to the name of your Rack app's class.
        service_name: 'my-service-name'

        # Use if APM Server requires a token
        secret_token: 'foobar'

        # Set custom APM Server URL (default: http://localhost:8200)
        server_url: 'localhost:8220',

        # Set the service environment
        environment: 'my-environment'"
      `);
    });
  });
  describe('Go agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'go',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.
        # If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.
        export ELASTIC_APM_SERVICE_NAME=my-service-name

        # Use if APM Server requires a secret token
        export ELASTIC_APM_SECRET_TOKEN=

        # Set custom APM Server URL (default: http://localhost:8200)
        export ELASTIC_APM_SERVER_URL=

        # Set the service environment
        export ELASTIC_APM_ENVIRONMENT=my-environment
        "
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'go',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Set the service name. Allowed characters: # a-z, A-Z, 0-9, -, _, and space.
        # If ELASTIC_APM_SERVICE_NAME is not specified, the executable name will be used.
        export ELASTIC_APM_SERVICE_NAME=my-service-name

        # Use if APM Server requires a secret token
        export ELASTIC_APM_SECRET_TOKEN=foobar

        # Set custom APM Server URL (default: http://localhost:8200)
        export ELASTIC_APM_SERVER_URL=localhost:8220

        # Set the service environment
        export ELASTIC_APM_ENVIRONMENT=my-environment
        "
      `);
    });
  });
  describe('dotNet agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'dotnet',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
          \\"ElasticApm\\": {
            \\"ServiceName\\": \\"my-service-name\\", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
            \\"SecretToken\\": \\"\\",
            \\"ServerUrl\\": \\"\\", //Set custom APM Server URL (default: http://localhost:8200)
            \\"Environment\\": \\"my-environment\\", // Set the service environment
          }
        }"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'dotnet',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
          \\"ElasticApm\\": {
            \\"ServiceName\\": \\"my-service-name\\", //allowed characters: a-z, A-Z, 0-9, -, _, and space. Default is the entry assembly of the application
            \\"SecretToken\\": \\"foobar\\",
            \\"ServerUrl\\": \\"localhost:8220\\", //Set custom APM Server URL (default: http://localhost:8200)
            \\"Environment\\": \\"my-environment\\", // Set the service environment
          }
        }"
      `);
    });
  });
  describe('PHP agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'php',
        policyDetails: {},
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "elastic_apm.service_name=\\"my-service-name\\"
        elastic_apm.secret_token=\\"\\"
        elastic_apm.server_url=\\"\\"
        elastic_apm.environment=\\"my-environment\\"
        "
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'php',
        policyDetails: {
          apmServerUrl: 'localhost:8220',
          secretToken: 'foobar',
        },
        defaultValues,
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "elastic_apm.service_name=\\"my-service-name\\"
        elastic_apm.secret_token=\\"foobar\\"
        elastic_apm.server_url=\\"localhost:8220\\"
        elastic_apm.environment=\\"my-environment\\"
        "
      `);
    });
  });
});
