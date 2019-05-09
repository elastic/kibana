/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { revealImage as revealImageFn } from '../../functions/common/revealImage';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof revealImageFn>> = {
  help: i18n.translate('xpack.canvas.functions.revealImageHelpText', {
    defaultMessage: 'Configure a image reveal element',
  }),
  args: {
    image: i18n.translate('xpack.canvas.functions.revealImage.args.imageHelpText', {
      defaultMessage: 'The image to reveal',
    }),
    emptyImage: i18n.translate('xpack.canvas.functions.revealImage.args.emptyImageHelpText', {
      defaultMessage: 'An optional background image to reveal over',
    }),
    origin: i18n.translate('xpack.canvas.functions.revealImage.args.originHelpText', {
      defaultMessage: 'Where to start from. Eg, top, left, bottom or right',
    }),
  },
};
