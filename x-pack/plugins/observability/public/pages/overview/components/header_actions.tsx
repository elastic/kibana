/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTourStep,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { DatePicker } from '../../../components/shared/date_picker';
import { useDatePickerContext } from '../../../hooks/use_date_picker_context';
import { useObservabilityTourContext } from '../../../components/shared/tour';

export interface HeaderActionsProps {
  showTour?: boolean;
  onGuidedSetupClick: () => void;
  onTimeRangeRefresh: () => void;
  onTourDismiss: () => void;
}

export function HeaderActions({
  showTour = false,
  onGuidedSetupClick,
  onTimeRangeRefresh,
  onTourDismiss,
}: HeaderActionsProps) {
  const buttonRef = useRef();

  const { relativeStart, relativeEnd, refreshInterval, refreshPaused } = useDatePickerContext();

  const { endTour, isTourVisible } = useObservabilityTourContext();

  return (
    <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <DatePicker
          rangeFrom={relativeStart}
          rangeTo={relativeEnd}
          refreshInterval={refreshInterval}
          refreshPaused={refreshPaused}
          width="auto"
          onTimeRangeRefresh={onTimeRangeRefresh}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          // @ts-expect-error the EUI verson that kibana uses right now doesn't have the correct types
          buttonRef={buttonRef}
          color="text"
          data-test-subj="guidedSetupButton"
          id="guidedSetupButton"
          iconType="wrench"
          onClick={() => {
            if (isTourVisible) {
              endTour();
            }

            onGuidedSetupClick();
          }}
        >
          <FormattedMessage
            id="xpack.observability.overview.guidedSetupButton"
            defaultMessage="Data assistant"
          />
        </EuiButton>

        {showTour ? (
          <EuiTourStep
            // @ts-expect-error the EUI verson that kibana uses right now doesn't have the correct types
            anchor={() => buttonRef.current}
            step={1}
            stepsTotal={1}
            isStepOpen
            maxWidth={400}
            onFinish={onTourDismiss}
            title={i18n.translate('xpack.observability.overview.guidedSetupTourTitle', {
              defaultMessage: 'Data assistant is always available',
            })}
            content={
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.observability.overview.guidedSetupTourContent"
                  defaultMessage="If you're ever in doubt you can always access the data assistant and view your next steps by clicking here."
                />
              </EuiText>
            }
            footerAction={
              <EuiButtonEmpty color="text" flush="right" size="xs" onClick={onTourDismiss}>
                <FormattedMessage
                  id="xpack.observability.overview.guidedSetupTourDismissButton"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            }
          />
        ) : null}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
