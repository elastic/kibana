/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import React, { PureComponent, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import { MinAgeInput } from '../min_age_input';

import {
  EuiTitle,
  EuiSpacer,
  EuiDescribedFormGroup,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
} from '../../../../store/constants';
import { ActiveBadge, PhaseErrorMessage } from '../../../../components';

export class DeletePhase extends PureComponent {
  static propTypes = {
    setPhaseData: PropTypes.func.isRequired,
    isShowingErrors: PropTypes.bool.isRequired,
    errors: PropTypes.object.isRequired,
    phaseData: PropTypes.shape({
      [PHASE_ENABLED]: PropTypes.bool.isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE]: PropTypes.oneOfType([
        PropTypes.number,
        PropTypes.string
      ]).isRequired,
      [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: PropTypes.string.isRequired
    }).isRequired
  };

  render() {
    const {
      setPhaseData,
      phaseData,
      errors,
      isShowingErrors,
    } = this.props;

    return (
      <EuiDescribedFormGroup
        title={
          <div>
            <span className="eui-displayInlineBlock eui-alignMiddle">
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseLabel"
                defaultMessage="Delete phase"
              />
            </span>{' '}
            {phaseData[PHASE_ENABLED] ? (
              <ActiveBadge />
            ) : null}
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                defaultMessage="Use this phase to define how long to retain your data."
              />

            </p>
            <PhaseErrorMessage isShowingErrors={isShowingErrors} />
          </Fragment>
        }
        fullWidth
      >
        {phaseData[PHASE_ENABLED] ? (
          <Fragment>

            <div>
              <EuiSpacer />
              <EuiButton
                color="danger"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, false);
                }}
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deactivateDeletePhaseButton"
                  defaultMessage="Deactivate delete phase"
                />
              </EuiButton>
            </div>

            <EuiSpacer size="m" />
            <EuiTitle size="s">
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.configurationTitle"
                  defaultMessage="Configuration"
                />
              </p>
            </EuiTitle>
            <EuiSpacer size="m" />
            <MinAgeInput
              errors={errors}
              phaseData={phaseData}
              phase={PHASE_DELETE}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          </Fragment>
        ) : (
          <div>
            <EuiSpacer />
            <EuiButton
              onClick={async () => {
                await setPhaseData(PHASE_ENABLED, true);
              }}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateDeletePhaseButton"
                defaultMessage="Activate delete phase"
              />
            </EuiButton>
          </div>
        )}
      </EuiDescribedFormGroup>
    );
  }
}
