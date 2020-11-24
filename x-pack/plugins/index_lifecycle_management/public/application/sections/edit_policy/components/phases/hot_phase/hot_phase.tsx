/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiSpacer } from '@elastic/eui';

import { Phases } from '../../../../../../../common/types';

import { useFormData } from '../../../../../../shared_imports';

import { ActiveBadge } from '../../';

import { Forcemerge, SetPriorityInput, useRolloverPath } from '../shared_fields';

import { RolloverFields } from './components';

const hotProperty: keyof Phases = 'hot';

export const HotPhase: FunctionComponent = () => {
  const [formData] = useFormData({
    watch: useRolloverPath,
  });
  const isRolloverEnabled = get(formData, useRolloverPath);

  return (
    <>
      <EuiDescribedFormGroup
        title={
          <div>
            <h2 className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseLabel"
                defaultMessage="Hot phase"
              />
            </h2>{' '}
            <ActiveBadge />
          </div>
        }
        titleSize="s"
        description={
          <>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.hotPhaseDescriptionMessage"
                defaultMessage="This phase is required. You are actively querying and
                    writing to your index.  For faster updates, you can roll over the index when it gets too big or too old."
              />
            </p>
          </>
        }
        fullWidth
      >
        <div />
      </EuiDescribedFormGroup>
      <RolloverFields />
      <EuiSpacer />
      {isRolloverEnabled && <Forcemerge phase="hot" />}
      <SetPriorityInput phase={hotProperty} />
    </>
  );
};
