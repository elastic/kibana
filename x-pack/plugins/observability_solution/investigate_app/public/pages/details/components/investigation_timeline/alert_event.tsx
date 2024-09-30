/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LineAnnotation } from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { EventSchema } from '@kbn/investigation-shared';

export const AlertEvent = ({ event }: { event: EventSchema }) => {
  return (
    <LineAnnotation
      id={event.id}
      domainType="xDomain"
      marker={
        <>
          <div
            style={{
              marginTop: -10,
              backgroundColor: 'red',
              borderRadius: 4,
              padding: 4,
              display: 'flex',
              height: 20,
              width: 20,
            }}
          >
            <EuiIcon type="warning" size="s" color="white" />
          </div>
          <span
            style={{
              position: 'relative',
              top: -40,
            }}
          >
            {ALERT_LABEL}
          </span>
        </>
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

const ALERT_LABEL = i18n.translate('xpack.investigateApp.alertEvent.alertLabel', {
  defaultMessage: 'Alert',
});
