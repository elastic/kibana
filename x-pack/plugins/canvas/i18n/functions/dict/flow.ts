/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { flow } from '../../../canvas_plugin_src/functions/common/flow';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { SVG } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof flow>> = {
  help: i18n.translate('xpack.canvas.functions.flowHelpText', {
    defaultMessage: 'Creates a flow node.',
  }),
  args: {
    shape: i18n.translate('xpack.canvas.functions.flow.args.flowHelpText', {
      defaultMessage: 'Pick a flow node type.',
    }),
    border: i18n.translate('xpack.canvas.functions.flow.args.borderHelpText', {
      defaultMessage: 'An {SVG} color for the border outlining the node.',
      values: {
        SVG,
      },
    }),
    borderWidth: i18n.translate('xpack.canvas.functions.node.args.borderWidthHelpText', {
      defaultMessage: 'The thickness of the border.',
    }),
    fill: i18n.translate('xpack.canvas.functions.node.args.fillHelpText', {
      defaultMessage: 'An {SVG} color to fill the node.',
      values: {
        SVG,
      },
    }),
    maintainAspect: i18n.translate('xpack.canvas.functions.node.args.maintainAspectHelpText', {
      defaultMessage: `Maintain the node's original aspect ratio?`,
    }),
  },
};
