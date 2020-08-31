/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { useLoadNodes } from '../../../../services/api';
import { WarmPhase } from '../../../../services/policies/types';
import { AdvancedSectionLayout } from '../advanced_section_layout';
import { NodeAllocation } from './node_allocation';
import { SharedProps } from './types';

const i18nTexts = {
  useDataTierAllocation: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.dataTierAllocation.useDataTierSwitchLabel',
    { defaultMessage: 'Use data tier allocation' }
  ),
};

export const DataTierAllocation = <T extends any>(
  props: React.PropsWithChildren<SharedProps<WarmPhase>>
) => {
  const { isLoading, data, error, sendRequest } = useLoadNodes();

  // useEffect(
  //   () => {
  //     if (!isLoading && restProps.phaseData.allocationType === undefined) {
  //       setPhaseData('allocationType', hasNodeAttributes ? 'custom' : 'none');
  //     }
  //   },
  //   // Do this once only when mounting this component
  //   [isLoading, hasNodeAttributes] /* eslint-disable-line react-hooks/exhaustive-deps */
  // );

  if (isLoading) {
    return (
      <>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="m" />
      </>
    );
  }

  if (error) {
    const { statusCode, message } = error;
    return (
      <>
        <EuiCallOut
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesLoadingFailedTitle"
              defaultMessage="Unable to load node attributes"
            />
          }
          color="danger"
        >
          <p>
            {message} ({statusCode})
          </p>
          <EuiButton onClick={sendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        </EuiCallOut>

        <EuiSpacer size="xl" />
      </>
    );
  }

  const isUsingDataTierAllocation =
    props.phaseData.dataTierAllocationType === 'custom' ||
    props.phaseData.dataTierAllocationType === 'default';

  return (
    <>
      <EuiSwitch
        label={i18nTexts.useDataTierAllocation}
        checked={isUsingDataTierAllocation}
        onChange={(e) => {
          if (!e.target.checked) {
            props.setPhaseData('dataTierAllocationType', 'none');
          } else {
            props.setPhaseData('dataTierAllocationType', 'default');
          }
        }}
      />
      <EuiSpacer size="s" />
      {isUsingDataTierAllocation ? (
        <AdvancedSectionLayout>
          <div style={{ paddingLeft: 24 }}>
            <EuiSwitch
              label="Use custom data tier allocation."
              checked={props.phaseData.dataTierAllocationType === 'custom'}
              onChange={(e) => {
                if (e.target.checked) {
                  props.setPhaseData('dataTierAllocationType', 'custom');
                } else {
                  props.setPhaseData('dataTierAllocationType', 'default');
                }
              }}
            />
            <EuiSpacer size="m" />
            {props.phaseData.dataTierAllocationType === 'custom' ? (
              <NodeAllocation nodes={data!.nodesByAttributes} {...props} />
            ) : null}
          </div>
        </AdvancedSectionLayout>
      ) : null}
    </>
  );
};
