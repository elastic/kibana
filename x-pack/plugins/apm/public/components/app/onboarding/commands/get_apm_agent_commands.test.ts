/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApmAgentCommands } from './get_apm_agent_commands';

describe('getCommands', () => {
  describe('Unknown agent', () => {
    it('renders empty command', () => {
      const commands = getApmAgentCommands({
        variantId: 'foo',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).toBe('');
    });
  });
  describe('Java agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'java',
      });
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.api_key= \\\\
        -Delastic.apm.server_url= \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-service-name.jar"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'java',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.secret_token=foobar \\\\
        -Delastic.apm.server_url=localhost:8220 \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-service-name.jar"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'java',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "java -javaagent:/path/to/elastic-apm-agent-<version>.jar \\\\
        -Delastic.apm.secret_token=foobar \\\\
        -Delastic.apm.server_url=localhost:8220 \\\\
        -Delastic.apm.application_packages=org.example \\\\
        -jar my-service-name.jar"
      `);
    });
  });

  describe('Node.js agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'node',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the very top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({
          // Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
          apiKey: '',

          // Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          serverUrl: '',
        })"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'node',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the very top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({
          // Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          secretToken: 'foobar',

          // Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          serverUrl: 'localhost:8220',
        })"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'node',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "// Add this to the very top of the first file loaded in your app
        var apm = require('elastic-apm-node').start({
          // Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          secretToken: 'foobar',

          // Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          serverUrl: 'localhost:8220',
        })"
      `);
    });
  });
  describe('Django agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'django',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "INSTALLED_APPS = (
          # Add the agent to installed apps
          'elasticapm.contrib.django',
          # ...
        )

        ELASTIC_APM = {
          # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
          'API_KEY': '',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': '',
        }

        MIDDLEWARE = (
          # Add our tracing middleware to send performance metrics
          'elasticapm.contrib.django.middleware.TracingMiddleware',
          #...
        )"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'django',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "INSTALLED_APPS = (
          # Add the agent to installed apps
          'elasticapm.contrib.django',
          # ...
        )

        ELASTIC_APM = {
          # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': 'localhost:8220',
        }

        MIDDLEWARE = (
          # Add our tracing middleware to send performance metrics
          'elasticapm.contrib.django.middleware.TracingMiddleware',
          #...
        )"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'django',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "INSTALLED_APPS = (
          # Add the agent to installed apps
          'elasticapm.contrib.django',
          # ...
        )

        ELASTIC_APM = {
          # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': 'localhost:8220',
        }

        MIDDLEWARE = (
          # Add our tracing middleware to send performance metrics
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
          # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
          'API_KEY': '',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': '',
        }

        apm = ElasticAPM(app)"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'flask',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
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
          # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': 'localhost:8220',
        }

        apm = ElasticAPM(app)"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'flask',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
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
          # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
          'SECRET_TOKEN': 'foobar',

          # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
          'SERVER_URL': 'localhost:8220',
        }

        apm = ElasticAPM(app)"
      `);
    });
  });
  describe('Ruby on Rails agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'rails',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:
        # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
        api_key: ''

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: ''"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'rails',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:
        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: 'localhost:8220'"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'rails',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:
        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: 'localhost:8220'"
      `);
    });
  });
  describe('Rack agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'rack',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
        api_key: ''

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: ''"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'rack',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: 'localhost:8220'"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'rack',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# config/elastic_apm.yml:

        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        secret_token: 'foobar'

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        server_url: 'localhost:8220'"
      `);
    });
  });
  describe('Go agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'go',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
        export ELASTIC_APM_API_KEY=

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        export ELASTIC_APM_SERVER_URL=
        "
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'go',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        export ELASTIC_APM_SECRET_TOKEN=foobar

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        export ELASTIC_APM_SERVER_URL=localhost:8220
        "
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'go',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "# Initialize using environment variables:

        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        export ELASTIC_APM_SECRET_TOKEN=foobar

        # Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        export ELASTIC_APM_SERVER_URL=localhost:8220
        "
      `);
    });
  });
  describe('DotNet agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'dotnet',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
          \\"ElasticApm\\": {
            /// Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
            \\"ApiKey\\": \\"\\",
            /// Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
            \\"ServerUrl\\": \\"\\",
          }
        }"
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'dotnet',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
          \\"ElasticApm\\": {
            /// Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
            \\"SecretToken\\": \\"foobar\\",
            /// Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
            \\"ServerUrl\\": \\"localhost:8220\\",
          }
        }"
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'dotnet',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "{
          \\"ElasticApm\\": {
            /// Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
            \\"SecretToken\\": \\"foobar\\",
            /// Set the custom APM Server URL (default: http://localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
            \\"ServerUrl\\": \\"localhost:8220\\",
          }
        }"
      `);
    });
  });
  describe('PHP agent', () => {
    it('renders empty commands', () => {
      const commands = getApmAgentCommands({
        variantId: 'php',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "
        # Use if APM Server requires an API Key. This is used to ensure that only your agents can send data to your APM server. Agents can use API keys as a replacement of secret token, APM server can have multiple API keys. When both secret token and API key are used, API key has priority and secret token is ignored.
        elastic_apm.api_key=\\"\\"

        # Set the custom APM Server URL (default: http:&#x2F;&#x2F;localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        elastic_apm.server_url=\\"\\""
      `);
    });
    it('renders with secret token and url', () => {
      const commands = getApmAgentCommands({
        variantId: 'php',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "
        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        elastic_apm.secret_token=\\"foobar\\"

        # Set the custom APM Server URL (default: http:&#x2F;&#x2F;localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        elastic_apm.server_url=\\"localhost:8220\\""
      `);
    });
    it('renders with api key even though secret token is present', () => {
      const commands = getApmAgentCommands({
        variantId: 'php',
        apmServerUrl: 'localhost:8220',
        secretToken: 'foobar',
        apiKey: 'myApiKey',
      });
      expect(commands).not.toBe('');
      expect(commands).toMatchInlineSnapshot(`
        "
        # Use if APM Server requires a secret token. Both the agent and APM Server must be configured with the same token. This ensures that only your agents can send data to your APM server.
        elastic_apm.secret_token=\\"foobar\\"

        # Set the custom APM Server URL (default: http:&#x2F;&#x2F;localhost:8200). The URL must be fully qualified, including protocol (http or https) and port.
        elastic_apm.server_url=\\"localhost:8220\\""
      `);
    });
  });
});
