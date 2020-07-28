/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { LinkPreview } from '../CustomLinkFlyout/LinkPreview';
import {
  render,
  getNodeText,
  getByTestId,
  act,
  wait,
} from '@testing-library/react';
import * as apmApi from '../../../../../../services/rest/createCallApmApi';

describe('LinkPreview', () => {
  let callApmApiSpy: jest.SpyInstance<any, never>;
  beforeAll(() => {
    callApmApiSpy = jest.spyOn(apmApi, 'callApmApi').mockReturnValue({
      transaction: { id: 'foo' },
    });
  });
  afterAll(() => {
    jest.clearAllMocks();
  });
  const getElementValue = (container: HTMLElement, id: string) =>
    getNodeText(
      ((getByTestId(container, id) as HTMLDivElement)
        .children as HTMLCollection)[0] as HTMLDivElement
    );

  it('shows label and url default values', () => {
    act(() => {
      const { container } = render(
        <LinkPreview label="" url="" filters={[{ key: '', value: '' }]} />
      );
      expect(getElementValue(container, 'preview-label')).toEqual('Elastic.co');
      expect(getElementValue(container, 'preview-url')).toEqual(
        'https://www.elastic.co'
      );
    });
  });

  it('shows label and url values', () => {
    act(() => {
      const { container } = render(
        <LinkPreview
          label="foo"
          url="https://baz.co"
          filters={[{ key: '', value: '' }]}
        />
      );
      expect(getElementValue(container, 'preview-label')).toEqual('foo');
      expect(
        (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
      ).toEqual('https://baz.co');
    });
  });

  it("shows warning when couldn't replace context variables", () => {
    act(() => {
      const { container } = render(
        <LinkPreview
          label="foo"
          url="https://baz.co?service.name={{invalid}"
          filters={[{ key: '', value: '' }]}
        />
      );
      expect(getElementValue(container, 'preview-label')).toEqual('foo');
      expect(
        (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
      ).toEqual('https://baz.co?service.name={{invalid}');
      expect(getByTestId(container, 'preview-warning')).toBeInTheDocument();
    });
  });
  it('replaces url with transaction id', async () => {
    const { container } = render(
      <LinkPreview
        label="foo"
        url="https://baz.co?transaction={{transaction.id}}"
        filters={[{ key: '', value: '' }]}
      />
    );
    await wait(() => expect(callApmApiSpy).toHaveBeenCalled());
    expect(getElementValue(container, 'preview-label')).toEqual('foo');
    expect(
      (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
    ).toEqual('https://baz.co?transaction=foo');
  });
});
