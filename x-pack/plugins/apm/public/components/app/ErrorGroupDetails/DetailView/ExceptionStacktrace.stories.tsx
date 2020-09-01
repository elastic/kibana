/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { storiesOf } from '@storybook/react';
import React from 'react';
import { EuiThemeProvider } from '../../../../../../observability/public';
import { Exception } from '../../../../../typings/es_schemas/raw/error_raw';
import { ExceptionStacktrace } from './ExceptionStacktrace';

storiesOf('app/ErrorGroupDetails/DetailView/ExceptionStacktrace', module)
  .addDecorator((storyFn) => {
    return <EuiThemeProvider>{storyFn()}</EuiThemeProvider>;
  })
  .add('JavaScript with some context', () => {
    const exceptions: Exception[] = [
      {
        code: '503',
        stacktrace: [
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'node_modules/elastic-apm-http-client/index.js',
            abs_path: '/app/node_modules/elastic-apm-http-client/index.js',
            line: {
              number: 711,
              context:
                "  const err = new Error('Unexpected APM Server response when polling config')",
            },
            function: 'processConfigErrorResponse',
            context: {
              pre: ['', 'function processConfigErrorResponse (res, buf) {'],
              post: ['', '  err.code = res.statusCode'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'node_modules/elastic-apm-http-client/index.js',
            abs_path: '/app/node_modules/elastic-apm-http-client/index.js',
            line: {
              number: 196,
              context:
                '        res.destroy(processConfigErrorResponse(res, buf))',
            },
            function: '<anonymous>',
            context: {
              pre: ['        }', '      } else {'],
              post: ['      }', '    })'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'node_modules/fast-stream-to-buffer/index.js',
            abs_path: '/app/node_modules/fast-stream-to-buffer/index.js',
            line: {
              number: 20,
              context: '        cb(err, buffers[0], stream)',
            },
            function: 'IncomingMessage.<anonymous>',
            context: {
              pre: ['        break', '      case 1:'],
              post: ['        break', '      default:'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'node_modules/once/once.js',
            abs_path: '/app/node_modules/once/once.js',
            line: {
              number: 25,
              context: '    return f.value = fn.apply(this, arguments)',
            },
            function: 'f',
            context: {
              pre: ['    if (f.called) return f.value', '    f.called = true'],
              post: ['  }', '  f.called = false'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'node_modules/end-of-stream/index.js',
            abs_path: '/app/node_modules/end-of-stream/index.js',
            line: {
              number: 36,
              context: '\t\tif (!writable) callback.call(stream);',
            },
            function: 'onend',
            context: {
              pre: ['\tvar onend = function() {', '\t\treadable = false;'],
              post: ['\t};', ''],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path: 'events.js',
            filename: 'events.js',
            line: {
              number: 327,
            },
            function: 'emit',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: '_stream_readable.js',
            abs_path: '_stream_readable.js',
            line: {
              number: 1220,
            },
            function: 'endReadableNT',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'internal/process/task_queues.js',
            abs_path: 'internal/process/task_queues.js',
            line: {
              number: 84,
            },
            function: 'processTicksAndRejections',
          },
        ],
        module: 'elastic-apm-http-client',
        handled: false,
        attributes: {
          response:
            '<html>\r\n<head><title>503 Service Temporarily Unavailable</title></head>\r\n<body>\r\n<center><h1>503 Service Temporarily Unavailable</h1></center>\r\n<hr><center>nginx/1.17.7</center>\r\n</body>\r\n</html>\r\n',
        },
        type: 'Error',
        message: 'Unexpected APM Server response when polling config',
      },
    ];

    return (
      <ExceptionStacktrace codeLanguage="javascript" exceptions={exceptions} />
    );
  })
  .add('Ruby with context and library frames', () => {
    const exceptions: Exception[] = [
      {
        stacktrace: [
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_record/core.rb',
            abs_path:
              '/usr/local/bundle/gems/activerecord-5.2.4.1/lib/active_record/core.rb',
            line: {
              number: 177,
            },
            function: 'find',
          },
          {
            library_frame: false,
            exclude_from_grouping: false,
            filename: 'api/orders_controller.rb',
            abs_path: '/app/app/controllers/api/orders_controller.rb',
            line: {
              number: 23,
              context: '      render json: Order.find(params[:id])\n',
            },
            function: 'show',
            context: {
              pre: ['\n', '    def show\n'],
              post: ['    end\n', '  end\n'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_controller/metal/basic_implicit_render.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/basic_implicit_render.rb',
            line: {
              number: 6,
            },
            function: 'send_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'abstract_controller/base.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/abstract_controller/base.rb',
            line: {
              number: 194,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_controller/metal/rendering.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/rendering.rb',
            line: {
              number: 30,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'abstract_controller/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/abstract_controller/callbacks.rb',
            line: {
              number: 42,
            },
            function: 'block in process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/callbacks.rb',
            line: {
              number: 132,
            },
            function: 'run_callbacks',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'abstract_controller/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/abstract_controller/callbacks.rb',
            line: {
              number: 41,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/rescue.rb',
            filename: 'action_controller/metal/rescue.rb',
            line: {
              number: 22,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/instrumentation.rb',
            filename: 'action_controller/metal/instrumentation.rb',
            line: {
              number: 34,
            },
            function: 'block in process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/notifications.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/notifications.rb',
            line: {
              number: 168,
            },
            function: 'block in instrument',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/notifications/instrumenter.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/notifications/instrumenter.rb',
            line: {
              number: 23,
            },
            function: 'instrument',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/notifications.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/notifications.rb',
            line: {
              number: 168,
            },
            function: 'instrument',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_controller/metal/instrumentation.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/instrumentation.rb',
            line: {
              number: 32,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal/params_wrapper.rb',
            filename: 'action_controller/metal/params_wrapper.rb',
            line: {
              number: 256,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_record/railties/controller_runtime.rb',
            abs_path:
              '/usr/local/bundle/gems/activerecord-5.2.4.1/lib/active_record/railties/controller_runtime.rb',
            line: {
              number: 24,
            },
            function: 'process_action',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'abstract_controller/base.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/abstract_controller/base.rb',
            line: {
              number: 134,
            },
            function: 'process',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_view/rendering.rb',
            abs_path:
              '/usr/local/bundle/gems/actionview-5.2.4.1/lib/action_view/rendering.rb',
            line: {
              number: 32,
            },
            function: 'process',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_controller/metal.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal.rb',
            line: {
              number: 191,
            },
            function: 'dispatch',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_controller/metal.rb',
            filename: 'action_controller/metal.rb',
            line: {
              number: 252,
            },
            function: 'dispatch',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'action_dispatch/routing/route_set.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/routing/route_set.rb',
            line: {
              number: 52,
            },
            function: 'dispatch',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/routing/route_set.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/routing/route_set.rb',
            line: {
              number: 34,
            },
            function: 'serve',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/journey/router.rb',
            filename: 'action_dispatch/journey/router.rb',
            line: {
              number: 52,
            },
            function: 'block in serve',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/journey/router.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/journey/router.rb',
            line: {
              number: 35,
            },
            function: 'each',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/journey/router.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/journey/router.rb',
            line: {
              number: 35,
            },
            function: 'serve',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/routing/route_set.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/routing/route_set.rb',
            line: {
              number: 840,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'rack/static.rb',
            abs_path: '/usr/local/bundle/gems/rack-2.2.3/lib/rack/static.rb',
            line: {
              number: 161,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/tempfile_reaper.rb',
            abs_path:
              '/usr/local/bundle/gems/rack-2.2.3/lib/rack/tempfile_reaper.rb',
            line: {
              number: 15,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/etag.rb',
            abs_path: '/usr/local/bundle/gems/rack-2.2.3/lib/rack/etag.rb',
            line: {
              number: 27,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/conditional_get.rb',
            abs_path:
              '/usr/local/bundle/gems/rack-2.2.3/lib/rack/conditional_get.rb',
            line: {
              number: 27,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/head.rb',
            abs_path: '/usr/local/bundle/gems/rack-2.2.3/lib/rack/head.rb',
            line: {
              number: 12,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/http/content_security_policy.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/http/content_security_policy.rb',
            line: {
              number: 18,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'rack/session/abstract/id.rb',
            abs_path:
              '/usr/local/bundle/gems/rack-2.2.3/lib/rack/session/abstract/id.rb',
            line: {
              number: 266,
            },
            function: 'context',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/session/abstract/id.rb',
            abs_path:
              '/usr/local/bundle/gems/rack-2.2.3/lib/rack/session/abstract/id.rb',
            line: {
              number: 260,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/cookies.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/cookies.rb',
            line: {
              number: 670,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/callbacks.rb',
            line: {
              number: 28,
            },
            function: 'block in call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/callbacks.rb',
            line: {
              number: 98,
            },
            function: 'run_callbacks',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/callbacks.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/callbacks.rb',
            line: {
              number: 26,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/debug_exceptions.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/debug_exceptions.rb',
            line: {
              number: 61,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'action_dispatch/middleware/show_exceptions.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/show_exceptions.rb',
            line: {
              number: 33,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'lograge/rails_ext/rack/logger.rb',
            abs_path:
              '/usr/local/bundle/gems/lograge-0.11.2/lib/lograge/rails_ext/rack/logger.rb',
            line: {
              number: 15,
            },
            function: 'call_app',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'rails/rack/logger.rb',
            abs_path:
              '/usr/local/bundle/gems/railties-5.2.4.1/lib/rails/rack/logger.rb',
            line: {
              number: 28,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/remote_ip.rb',
            filename: 'action_dispatch/middleware/remote_ip.rb',
            line: {
              number: 81,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'request_store/middleware.rb',
            abs_path:
              '/usr/local/bundle/gems/request_store-1.5.0/lib/request_store/middleware.rb',
            line: {
              number: 19,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/request_id.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/request_id.rb',
            line: {
              number: 27,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/method_override.rb',
            abs_path:
              '/usr/local/bundle/gems/rack-2.2.3/lib/rack/method_override.rb',
            line: {
              number: 24,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/runtime.rb',
            abs_path: '/usr/local/bundle/gems/rack-2.2.3/lib/rack/runtime.rb',
            line: {
              number: 22,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'active_support/cache/strategy/local_cache_middleware.rb',
            abs_path:
              '/usr/local/bundle/gems/activesupport-5.2.4.1/lib/active_support/cache/strategy/local_cache_middleware.rb',
            line: {
              number: 29,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/executor.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/executor.rb',
            line: {
              number: 14,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'action_dispatch/middleware/static.rb',
            abs_path:
              '/usr/local/bundle/gems/actionpack-5.2.4.1/lib/action_dispatch/middleware/static.rb',
            line: {
              number: 127,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rack/sendfile.rb',
            abs_path: '/usr/local/bundle/gems/rack-2.2.3/lib/rack/sendfile.rb',
            line: {
              number: 110,
            },
            function: 'call',
          },
          {
            library_frame: false,
            exclude_from_grouping: false,
            filename: 'opbeans_shuffle.rb',
            abs_path: '/app/lib/opbeans_shuffle.rb',
            line: {
              number: 32,
              context: '      @app.call(env)\n',
            },
            function: 'call',
            context: {
              pre: ['      end\n', '    else\n'],
              post: ['    end\n', '  rescue Timeout::Error\n'],
            },
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'elastic_apm/middleware.rb',
            abs_path:
              '/usr/local/bundle/gems/elastic-apm-3.8.0/lib/elastic_apm/middleware.rb',
            line: {
              number: 36,
            },
            function: 'call',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'rails/engine.rb',
            abs_path:
              '/usr/local/bundle/gems/railties-5.2.4.1/lib/rails/engine.rb',
            line: {
              number: 524,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'puma/configuration.rb',
            abs_path:
              '/usr/local/bundle/gems/puma-4.3.5/lib/puma/configuration.rb',
            line: {
              number: 228,
            },
            function: 'call',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'puma/server.rb',
            abs_path: '/usr/local/bundle/gems/puma-4.3.5/lib/puma/server.rb',
            line: {
              number: 713,
            },
            function: 'handle_request',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'puma/server.rb',
            abs_path: '/usr/local/bundle/gems/puma-4.3.5/lib/puma/server.rb',
            line: {
              number: 472,
            },
            function: 'process_client',
          },
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'puma/server.rb',
            abs_path: '/usr/local/bundle/gems/puma-4.3.5/lib/puma/server.rb',
            line: {
              number: 328,
            },
            function: 'block in run',
          },
          {
            exclude_from_grouping: false,
            library_frame: true,
            filename: 'puma/thread_pool.rb',
            abs_path:
              '/usr/local/bundle/gems/puma-4.3.5/lib/puma/thread_pool.rb',
            line: {
              number: 134,
            },
            function: 'block in spawn_thread',
          },
        ],
        handled: false,
        module: 'ActiveRecord',
        message: "Couldn't find Order with 'id'=956",
        type: 'ActiveRecord::RecordNotFound',
      },
    ];

    return <ExceptionStacktrace codeLanguage="ruby" exceptions={exceptions} />;
  });
