/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Demo } from './test_samples/demo';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

test('configure valid URL template', () => {
  const screen = render(<Demo />);

  const urlTemplate = 'https://elastic.co/?{{event.key}}={{event.value}}';
  fireEvent.change(screen.getByLabelText(/Enter URL template/i), {
    target: { value: urlTemplate },
  });

  const preview = screen.getByLabelText(/URL preview/i) as HTMLTextAreaElement;
  expect(preview.value).toMatchInlineSnapshot(`"https://elastic.co/?fakeKey=fakeValue"`);
  expect(preview.disabled).toEqual(true);
  const previewLink = screen.getByText('Preview') as HTMLAnchorElement;
  expect(previewLink.href).toMatchInlineSnapshot(`"https://elastic.co/?fakeKey=fakeValue"`);
  expect(previewLink.target).toMatchInlineSnapshot(`"_blank"`);
});

test('configure invalid URL template', () => {
  const screen = render(<Demo />);

  const urlTemplate = 'https://elastic.co/?{{event.wrongKey}}={{event.wrongValue}}';
  fireEvent.change(screen.getByLabelText(/Enter URL template/i), {
    target: { value: urlTemplate },
  });

  const previewTextArea = screen.getByLabelText(/URL preview/i) as HTMLTextAreaElement;
  expect(previewTextArea.disabled).toEqual(true);
  expect(previewTextArea.value).toEqual(urlTemplate);
  expect(screen.getByText(/invalid format/i)).toBeInTheDocument(); // check that error is shown

  const previewLink = screen.getByText('Preview') as HTMLAnchorElement;
  expect(previewLink.href).toEqual(urlTemplate);
  expect(previewLink.target).toMatchInlineSnapshot(`"_blank"`);
});
