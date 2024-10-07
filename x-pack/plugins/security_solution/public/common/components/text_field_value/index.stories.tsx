/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { addDecorator } from '@storybook/react';
import { euiLightVars } from '@kbn/ui-theme';

import { TextFieldValue } from '.';

addDecorator((storyFn) => (
  <ThemeProvider theme={() => ({ eui: euiLightVars, darkMode: false })}>{storyFn()}</ThemeProvider>
));

const longText = [...new Array(20).keys()].map((i) => ` super long text part ${i}`).join(' ');

export default {
  title: 'Components/TextFieldValue',
};

export const ShortTextNoLimit = () => <TextFieldValue fieldName="Field name" value="Small value" />;

ShortTextNoLimit.story = {
  name: 'short text, no limit',
};

export const ShortTextWithLimit = () => (
  <TextFieldValue fieldName="Field name" value="Small value" maxLength={100} />
);

ShortTextWithLimit.story = {
  name: 'short text, with limit',
};

export const LongTextNoLimit = () => <TextFieldValue fieldName="Field name" value={longText} />;

LongTextNoLimit.story = {
  name: 'long text, no limit',
};

export const LongTextWithLimit = () => (
  <TextFieldValue fieldName="Field name" value={longText} maxLength={100} />
);

LongTextWithLimit.story = {
  name: 'long text, with limit',
};
