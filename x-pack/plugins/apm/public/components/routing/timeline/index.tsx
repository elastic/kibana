/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import React from 'react';
import { environmentRt } from '../../../../common/environment_rt';
import { Breadcrumb } from '../../app/breadcrumb';
import { TimelineView } from '../../app/timeline_view';

export const timeline = {
  '/timeline': {
    element: (
      <Breadcrumb
        title={i18n.translate('xpack.apm.timeline.breadcrumbLabel', {
          defaultMessage: 'Timeline',
        })}
        href="/timeline"
      >
        <TimelineView />
      </Breadcrumb>
    ),
    params: t.type({
      query: t.intersection([
        t.type({
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
        environmentRt,
        t.partial({
          serviceName: t.string,
          refreshPaused: t.union([t.literal('true'), t.literal('false')]),
          refreshInterval: t.string,
        }),
      ]),
    }),
  },
};
