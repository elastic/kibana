/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LineAnnotation, AnnotationDomainType } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { EventSchema } from '@kbn/investigation-shared';

export const AlertEvent = ({ event }: { event: EventSchema }) => {
  return (
    <LineAnnotation
      id={event.id}
      domainType={AnnotationDomainType.XDomain}
      marker={
        <span>
          <EuiIcon style={{ marginTop: -16 }} type="dot" size="l" color="danger" />
        </span>
      }
      markerPosition="bottom"
      dataValues={[
        {
          dataValue: moment(event.timestamp).valueOf(),
          header: moment(event.timestamp).format('lll'),
          details: event.description,
        },
      ]}
    />
  );
};
