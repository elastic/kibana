/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React, { Fragment, useEffect, useState } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import type { Space } from '../../../../common';

interface Props {
  getActiveSpace: () => Promise<Space>;
}

export const AdvancedSettingsSubtitle = (props: Props) => {
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);

  useEffect(() => {
    props.getActiveSpace().then((space) => setActiveSpace(space));
  }, [props]);

  if (!activeSpace) return null;

  return (
    <Fragment>
      <EuiSpacer size={'m'} />
      <EuiCallOut
        color="primary"
        iconType="spacesApp"
        title={
          <p>
            <FormattedMessage
              id="xpack.spaces.management.advancedSettingsSubtitle.applyingSettingsOnPageToSpaceDescription"
              defaultMessage="The settings on this page apply to the {spaceName} space, unless otherwise specified."
              values={{
                spaceName: <strong>{activeSpace.name}</strong>,
              }}
            />
          </p>
        }
      />
    </Fragment>
  );
};
