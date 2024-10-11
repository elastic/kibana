/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { EventSchema } from '@kbn/investigation-shared';

export function AnnotationEvent({ event }: { event: EventSchema }) {
  const timestamp = event.timestamp;

  return (
    <LineAnnotation
      id={event.id}
      domainType={AnnotationDomainType.XDomain}
      dataValues={[
        {
          dataValue: moment(timestamp).valueOf(),
          details: event.description,
          header: moment(event.timestamp).format('lll'),
        },
      ]}
      marker={
        <span>
          <EuiIcon style={{ marginTop: -16 }} type="dot" size="l" />
        </span>
      }
      markerPosition="bottom"
    />
  );
}
