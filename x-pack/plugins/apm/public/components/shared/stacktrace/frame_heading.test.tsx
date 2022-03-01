/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { renderWithTheme } from '../../../utils/test_helpers';
import { FrameHeading } from './frame_heading';

function getRenderedStackframeText(
  stackframe: Stackframe,
  codeLanguage: string
) {
  const result = renderWithTheme(
    <FrameHeading
      codeLanguage={codeLanguage}
      isLibraryFrame={false}
      stackframe={stackframe}
    />
  );

  return result.getByTestId('FrameHeading').textContent;
}

describe('FrameHeading', () => {
  describe('with a Go stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            exclude_from_grouping: false,
            filename: 'main.go',
            abs_path: '/src/opbeans-go/main.go',
            line: { number: 196 },
            function: 'Main.func2',
            module: 'main',
          },
          'go'
        )
      ).toEqual('main.go in Main.func2 at line 196');
    });
  });

  describe('with a Java stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'OutputBuffer.java',
            classname: 'org.apache.catalina.connector.OutputBuffer',
            line: { number: 825 },
            module: 'org.apache.catalina.connector',
            function: 'flushByteBuffer',
          },
          'Java'
        )
      ).toEqual(
        'at org.apache.catalina.connector.OutputBuffer.flushByteBuffer(OutputBuffer.java:825)'
      );
    });
  });

  describe('with a .NET stackframe', () => {
    describe('with a classname', () => {
      it('renders', () => {
        expect(
          getRenderedStackframeText(
            {
              classname: 'OpbeansDotnet.Controllers.CustomersController',
              exclude_from_grouping: false,
              filename:
                '/src/opbeans-dotnet/Controllers/CustomersController.cs',
              abs_path:
                '/src/opbeans-dotnet/Controllers/CustomersController.cs',
              line: { number: 23 },
              module:
                'opbeans-dotnet, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null',
              function: 'Get',
            },
            'C#'
          )
        ).toEqual(
          'OpbeansDotnet.Controllers.CustomersController in Get in /src/opbeans-dotnet/Controllers/CustomersController.cs at line 23'
        );
      });
    });

    describe('with no classname', () => {
      it('renders', () => {
        expect(
          getRenderedStackframeText(
            {
              exclude_from_grouping: false,
              filename:
                'Microsoft.EntityFrameworkCore.Query.Internal.LinqOperatorProvider+ResultEnumerable`1',
              line: { number: 0 },
              function: 'GetEnumerator',
              module:
                'Microsoft.EntityFrameworkCore, Version=2.2.6.0, Culture=neutral, PublicKeyToken=adb9793829ddae60',
            },
            'C#'
          )
        ).toEqual(
          'Microsoft.EntityFrameworkCore.Query.Internal.LinqOperatorProvider+ResultEnumerable`1 in GetEnumerator'
        );
      });
    });
  });

  describe('with a Node stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            library_frame: true,
            exclude_from_grouping: false,
            filename: 'internal/async_hooks.js',
            abs_path: 'internal/async_hooks.js',
            line: { number: 120 },
            function: 'callbackTrampoline',
          },
          'javascript'
        )
      ).toEqual('at callbackTrampoline (internal/async_hooks.js:120)');
    });

    describe('with a classname', () => {
      it('renders', () => {
        expect(
          getRenderedStackframeText(
            {
              classname: 'TCPConnectWrap',
              exclude_from_grouping: false,
              library_frame: true,
              filename: 'internal/stream_base_commons.js',
              abs_path: 'internal/stream_base_commons.js',
              line: { number: 205 },
              function: 'onStreamRead',
            },
            'javascript'
          )
        ).toEqual(
          'at TCPConnectWrap.onStreamRead (internal/stream_base_commons.js:205)'
        );
      });
    });

    describe('with no classname and no function', () => {
      it('renders', () => {
        expect(
          getRenderedStackframeText(
            {
              exclude_from_grouping: false,
              library_frame: true,
              filename: 'internal/stream_base_commons.js',
              abs_path: 'internal/stream_base_commons.js',
              line: { number: 205 },
            },
            'javascript'
          )
        ).toEqual('at  (internal/stream_base_commons.js:205)');
      });
    });
  });

  describe('with a Python stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            exclude_from_grouping: false,
            library_frame: false,
            filename: 'opbeans/views.py',
            abs_path: '/app/opbeans/views.py',
            line: {
              number: 190,
              context: '        return post_order(request)',
            },
            module: 'opbeans.views',
            function: 'orders',
            context: {
              pre: [
                '        # set transaction name to post_order',
                "        elasticapm.set_transaction_name('POST opbeans.views.post_order')",
              ],
              post: [
                '    order_list = list(m.Order.objects.values(',
                "        'id', 'customer_id', 'customer__full_name', 'created_at'",
              ],
            },
            vars: { request: "<WSGIRequest: POST '/api/orders'>" },
          },
          'python'
        )
      ).toEqual('opbeans/views.py in orders at line 190');
    });
  });

  describe('with a Ruby stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            library_frame: false,
            exclude_from_grouping: false,
            abs_path: '/app/app/controllers/api/customers_controller.rb',
            filename: 'api/customers_controller.rb',
            line: {
              number: 15,
              context: '      render json: Customer.find(params[:id])\n',
            },
            function: 'show',
            context: {
              pre: ['\n', '    def show\n'],
              post: ['    end\n', '  end\n'],
            },
          },
          'ruby'
        )
      ).toEqual("api/customers_controller.rb:15 in `show'");
    });
  });

  describe('with a RUM stackframe', () => {
    it('renders', () => {
      expect(
        getRenderedStackframeText(
          {
            library_frame: false,
            exclude_from_grouping: false,
            filename: 'static/js/main.616809fb.js',
            abs_path: 'http://opbeans-frontend:3000/static/js/main.616809fb.js',
            sourcemap: {
              error:
                'No Sourcemap available for ServiceName opbeans-rum, ServiceVersion 2020-08-25 02:09:37, Path http://opbeans-frontend:3000/static/js/main.616809fb.js.',
              updated: false,
            },
            line: { number: 319, column: 3842 },
            function: 'unstable_runWithPriority',
          },
          'javascript'
        )
      ).toEqual(
        'at unstable_runWithPriority (static/js/main.616809fb.js:319:3842)'
      );
    });
  });
});
