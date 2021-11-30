/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

interface Props {
  checkGroup?: string;
}

export const EmptyJourney: FC<Props> = ({ checkGroup }) => (
  <EuiEmptyPrompt
    iconType="cross"
    title={
      <h2>
        <FormattedMessage
          id="xpack.uptime.synthetics.emptyJourney.title"
          defaultMessage="There are no steps for this journey"
        />
      </h2>
    }
    body={
      <>
        <p>
          <FormattedMessage
            id="xpack.uptime.synthetics.emptyJourney.message.heading"
            defaultMessage="This journey did not contain any steps."
          />
        </p>
        {!!checkGroup && (
          <p>
            <FormattedMessage
              id="xpack.uptime.synthetics.emptyJourney.message.checkGroupField"
              defaultMessage="The journey's check group is {codeBlock}."
              values={{ codeBlock: <code>{checkGroup}</code> }}
            />
          </p>
        )}
        <p>
          <FormattedMessage
            id="xpack.uptime.synthetics.emptyJourney.message.footer"
            defaultMessage="There is no further information to display."
          />
        </p>
      </>
    }
  />
);
