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
          serviceName: 'my-service-name',

          serverUrl: '',

          serviceVersion: '',

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
          serviceName: 'my-service-name',

          serverUrl: 'localhost:8220',

          serviceVersion: '',

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
        "// Add this to the very top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({
          serviceName: 'my-service-name',

          secretToken: '',

          serverUrl: '',

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
        "// Add this to the very top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({
          serviceName: 'my-service-name',

          secretToken: 'foobar',

          serverUrl: 'localhost:8220',

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
        "INSTALLED_APPS = (
          'elasticapm.contrib.django',
          # ...
        )

        ELASTIC_APM = {
          'SERVICE_NAME': 'my-service-name',

          'SECRET_TOKEN': '',

          'SERVER_URL': '',

          'ENVIRONMENT': 'my-environment',
        }

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
        "INSTALLED_APPS = (
          'elasticapm.contrib.django',
          # ...
        )

        ELASTIC_APM = {
          'SERVICE_NAME': 'my-service-name',

          'SECRET_TOKEN': 'foobar',

          'SERVER_URL': 'localhost:8220',

          'ENVIRONMENT': 'my-environment',
        }

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
        "# Initialize using environment variables
        from elasticapm.contrib.flask import ElasticAPM
        app = Flask(__name__)
        apm = ElasticAPM(app)

        # Or use ELASTIC_APM in your application's settings
        from elasticapm.contrib.flask import ElasticAPM
        app.config['ELASTIC_APM'] = {
          'SERVICE_NAME': 'my-service-name',

          'SECRET_TOKEN': '',

          'SERVER_URL': '',

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
        "# Initialize using environment variables
        from elasticapm.contrib.flask import ElasticAPM
        app = Flask(__name__)
        apm = ElasticAPM(app)

        # Or use ELASTIC_APM in your application's settings
        from elasticapm.contrib.flask import ElasticAPM
        app.config['ELASTIC_APM'] = {
          'SERVICE_NAME': 'my-service-name',

          'SECRET_TOKEN': 'foobar',

          'SERVER_URL': 'localhost:8220',

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

        service_name: 'my-service-name'

        secret_token: ''

        server_url: ''

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

        service_name: 'my-service-name'

        secret_token: 'foobar'

        server_url: 'localhost:8220'

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

        service_name: 'my-service-name'

        secret_token: ''

        server_url: '',

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

        service_name: 'my-service-name'

        secret_token: 'foobar'

        server_url: 'localhost:8220',

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
        export ELASTIC_APM_SERVICE_NAME=my-service-name

        export ELASTIC_APM_SECRET_TOKEN=

        export ELASTIC_APM_SERVER_URL=

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
        export ELASTIC_APM_SERVICE_NAME=my-service-name

        export ELASTIC_APM_SECRET_TOKEN=foobar

        export ELASTIC_APM_SERVER_URL=localhost:8220

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
            \\"ServiceName\\": \\"my-service-name\\",
            \\"SecretToken\\": \\"\\",
            \\"ServerUrl\\": \\"\\",
            \\"Environment\\": \\"my-environment\\",
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
            \\"ServiceName\\": \\"my-service-name\\",
            \\"SecretToken\\": \\"foobar\\",
            \\"ServerUrl\\": \\"localhost:8220\\",
            \\"Environment\\": \\"my-environment\\",
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

        elastic_apm.environment=\\"my-environment\\""
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

        elastic_apm.environment=\\"my-environment\\""
      `);
    });
  });
});
