/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, renderWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { PingListExpandedRowComponent } from './expanded_row';
import { Ping } from '../../../../common/runtime_types';
import { DocLinkForBody } from './doc_link_body';

describe('PingListExpandedRow', () => {
  let ping: Ping;
  beforeEach(() => {
    ping = {
      docId: 'fdeio12',
      timestamp: '19290310',
      monitor: {
        check_group: 'check_group_id',
        duration: {
          us: 12345,
        },
        id: '123',
        status: 'down',
        type: 'http',
      },
      http: {
        response: {
          body: {
            bytes: 1200000,
            hash: 'testhash',
            content: '<http><head><title>The Title</title></head><body></body></http>',
          },
        },
      },
    };
  });

  it('renders expected elements for valid props', () => {
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it('renders error information when an error field is present', () => {
    ping.error = {
      code: '403',
      message: 'Forbidden',
    };
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`doesn't render list items if the body field is undefined`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http.response.body;
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`doesn't render list items if the response field is undefined`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http.response;
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`doesn't render list items if the http field is undefined`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http;
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`shallow renders link to docs if body is not recorded but it is present`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http.response.body.content;
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`renders link to docs if body is not recorded but it is present`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http.response.body.content;
    expect(renderWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchSnapshot();
  });

  it(`mount component to find link to docs if body is not recorded but it is present`, () => {
    // @ts-ignore this shouldn't be undefined unless the beforeEach block is modified
    delete ping.http.response.body.content;
    const component = mountWithIntl(<PingListExpandedRowComponent ping={ping} />);

    const docLinkComponent = component.find(DocLinkForBody);

    expect(docLinkComponent).toHaveLength(1);
  });

  it('renders a synthetics expanded row for synth monitor', () => {
    ping.monitor.type = 'browser';
    expect(shallowWithIntl(<PingListExpandedRowComponent ping={ping} />)).toMatchInlineSnapshot(`
      <EuiFlexGroup
        direction="column"
      >
        <EuiFlexItem>
          <EuiCallOut
            color="primary"
          >
            <EuiDescriptionList
              listItems={
                Array [
                  Object {
                    "description": <React.Fragment>
                      <BodyDescription
                        body={
                          Object {
                            "bytes": 1200000,
                            "content": "<http><head><title>The Title</title></head><body></body></http>",
                            "hash": "testhash",
                          }
                        }
                      />
                      <EuiSpacer
                        size="s"
                      />
                      <BodyExcerpt
                        content="<http><head><title>The Title</title></head><body></body></http>"
                      />
                    </React.Fragment>,
                    "title": "Response Body",
                  },
                ]
              }
            />
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    `);
  });
});
