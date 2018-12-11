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
  EuiDescribedFormGroup,
  EuiButton,
} from '@elastic/eui';
import {
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE_UNITS,
} from '../../../../store/constants';
import { ActiveBadge, PhaseErrorMessage } from '../../../components';

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
            {phaseData[PHASE_ENABLED] && !isShowingErrors ? (
              <ActiveBadge />
            ) : null}
            <PhaseErrorMessage isShowingErrors={isShowingErrors} />
          </div>
        }
        titleSize="s"
        description={
          <Fragment>
            <p>
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deletePhaseDescriptionText"
                defaultMessage="You no longer need your index.  You can define when it is safe to delete it."
              />

            </p>
            {phaseData[PHASE_ENABLED] ? (
              <EuiButton
                color="danger"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, false);
                }}
                aria-controls="deletePhaseContent"
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.deactivateDeletePhaseButton"
                  defaultMessage="Deactivate delete phase"
                />
              </EuiButton>
            ) : (
              <EuiButton
                data-test-subj="activatePhaseButton-delete"
                onClick={async () => {
                  await setPhaseData(PHASE_ENABLED, true);
                }}
                aria-controls="deletePhaseContent"
              >
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.deletePhase.activateDeletePhaseButton"
                  defaultMessage="Activate delete phase"
                />
              </EuiButton>
            )}
          </Fragment>
        }
        fullWidth
      >
        <div id="deletePhaseContent" aria-live="polite" role="region">
          {phaseData[PHASE_ENABLED] ? (
            <MinAgeInput
              errors={errors}
              phaseData={phaseData}
              phase={PHASE_DELETE}
              isShowingErrors={isShowingErrors}
              setPhaseData={setPhaseData}
            />
          ) : <div />}
        </div>
      </EuiDescribedFormGroup>
    );
  }
}
