/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import {
  render,
  getNodeText,
  getByTestId,
  act,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import * as stories from './link_preview.stories';

const { Example } = composeStories(stories);

export const removeExternalLinkText = (str: string) =>
  str.replace(/\(opens in a new tab or window\)/g, '');

describe('LinkPreview', () => {
  const getElementValue = (container: HTMLElement, id: string) =>
    getNodeText(
      (
        (getByTestId(container, id) as HTMLDivElement)
          .children as HTMLCollection
      )[0] as HTMLDivElement
    );

  it('shows label and url default values', () => {
    act(() => {
      const { container } = render(
        <Example label="" url="" filters={[{ key: '', value: '' }]} />
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
        <Example
          label="foo"
          url="https://baz.co"
          filters={[{ key: '', value: '' }]}
        />
      );
      expect(getElementValue(container, 'preview-label')).toEqual('foo');
      expect(
        removeExternalLinkText(
          (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
        )
      ).toContain('https://baz.co');
    });
  });

  it("shows warning when couldn't replace context variables", () => {
    act(() => {
      const { container } = render(
        <Example
          label="foo"
          url="https://baz.co?service.name={{invalid}"
          filters={[{ key: '', value: '' }]}
        />
      );
      expect(getElementValue(container, 'preview-label')).toEqual('foo');
      expect(
        removeExternalLinkText(
          (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
        )
      ).toContain('https://baz.co?service.name={{invalid}');
      expect(getByTestId(container, 'preview-warning')).toBeInTheDocument();
    });
  });

  it('replaces url with transaction id', async () => {
    const { container } = render(
      <Example
        label="foo"
        url="https://baz.co?transaction={{transaction.id}}"
        filters={[{ key: '', value: '' }]}
      />
    );

    await waitFor(() => {
      expect(getElementValue(container, 'preview-label')).toEqual('foo');
      expect(
        removeExternalLinkText(
          (getByTestId(container, 'preview-link') as HTMLAnchorElement).text
        )
      ).toContain('https://baz.co?transaction=0');
    });
  });
});
