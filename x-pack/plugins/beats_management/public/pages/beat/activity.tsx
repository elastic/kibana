/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { FrontendLibs } from '../../lib/lib';

interface BeatActivityPageProps {
  libs: FrontendLibs;
}

export const BeatActivityPage = (props: BeatActivityPageProps) => (
  <div>
    <FormattedMessage
      id="xpack.beatsManagement.beat.beatActivityViewTitle"
      defaultMessage="Beat Activity View"
    />
  </div>
);
