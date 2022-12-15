/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ComponentStory } from '@storybook/react';

import { KibanaReactStorybookDecorator } from '../../../utils/kibana_react.storybook_decorator';
import {
  DeleteConfirmationModal as Component,
  DeleteConfirmationModalProps,
} from './slo_list_item_delete_confirmation_modal';
import { anSLO } from '../../../../common/data/slo';

export default {
  component: Component,
  title: 'app/SLO/ListPage/SloListItemDeleteConfirmationModal',
  decorators: [KibanaReactStorybookDecorator],
};

const Template: ComponentStory<typeof Component> = (props: DeleteConfirmationModalProps) => (
  <Component {...props} />
);

const defaultProps = {
  slo: anSLO,
};

export const SloListItemDeleteConfirmationModal = Template.bind({});
SloListItemDeleteConfirmationModal.args = defaultProps;
