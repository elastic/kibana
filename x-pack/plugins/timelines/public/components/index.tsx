/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';

import { PLUGIN_NAME } from '../../common';
import { TimelineProps } from '../types';

export const Timeline = (props: TimelineProps) => {
  return (
    <I18nProvider>
      <div data-test-subj="timeline-wrapper">
        <FormattedMessage
          id="xpack.timelines.placeholder"
          defaultMessage="Plugin: {name} Timeline: {timelineId}"
          values={{ name: PLUGIN_NAME, timelineId: props.timelineId }}
        />
      </div>
    </I18nProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { Timeline as default };
