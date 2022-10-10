/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { css } from '@emotion/react';

import { FilesContext } from '../context';
import { getImageMetadata } from '../util';
import { Image, Props } from './image';
import { getImageData as getBlob, base64dLogo } from './image.constants.stories';
import { FilesClient } from '../../types';

const defaultArgs: Props = { alt: 'test', src: `data:image/png;base64,${base64dLogo}` };

export default {
  title: 'components/Image',
  component: Image,
  args: defaultArgs,
  decorators: [
    (Story) => (
      <FilesContext client={{} as unknown as FilesClient}>
        <Story />
      </FilesContext>
    ),
  ],
} as ComponentMeta<typeof Image>;

const Template: ComponentStory<typeof Image> = (props: Props, { loaded: { meta } }) => (
  <Image size="original" {...props} meta={meta} ref={action('ref')} />
);

export const Basic = Template.bind({});

export const WithBlurhash = Template.bind({});
WithBlurhash.storyName = 'With blurhash';
WithBlurhash.args = {
  style: { visibility: 'hidden' },
};
WithBlurhash.loaders = [
  async () => ({
    meta: await getImageMetadata(getBlob()),
  }),
];
WithBlurhash.decorators = [
  (Story) => {
    const alwaysShowBlurhash = `img:nth-of-type(1) { opacity: 1 !important; }`;
    return (
      <>
        <style>{alwaysShowBlurhash}</style>
        <Story />
      </>
    );
  },
];

export const BrokenSrc = Template.bind({});
BrokenSrc.storyName = 'Broken src';
BrokenSrc.args = {
  src: 'foo',
};

export const WithBlurhashAndBrokenSrc = Template.bind({});
WithBlurhashAndBrokenSrc.storyName = 'With blurhash and broken src';
WithBlurhashAndBrokenSrc.args = {
  src: 'foo',
};
WithBlurhashAndBrokenSrc.loaders = [
  async () => ({
    blurhash: await getImageMetadata(getBlob()),
  }),
];

export const OffScreen = Template.bind({});
OffScreen.storyName = 'Offscreen';
OffScreen.args = { onFirstVisible: action('visible') };
OffScreen.decorators = [
  (Story) => (
    <>
      <p>Scroll down</p>
      <div
        css={css`
          margin-top: 100vh;
        `}
      >
        <Story />
      </div>
    </>
  ),
];
