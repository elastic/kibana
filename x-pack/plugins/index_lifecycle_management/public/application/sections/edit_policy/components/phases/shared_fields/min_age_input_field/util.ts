/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Phases } from '../../../../../../../../common/types';

type PhaseWithMinAgeAction = 'warm' | 'cold' | 'delete';

export function getUnitsAriaLabelForPhase(phase: keyof Phases) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case 'warm':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of warm phase',
        }
      );

    case 'cold':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of cold phase',
        }
      );

    case 'delete':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of delete phase',
        }
      );
  }
}
export function getTimingLabelForPhase(phase: PhaseWithMinAgeAction) {
  // NOTE: Hot phase isn't necessary, because indices begin in the hot phase.
  switch (phase) {
    case 'warm':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeLabel', {
        defaultMessage: 'Timing for warm phase',
      });

    case 'cold':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeLabel', {
        defaultMessage: 'Timing for cold phase',
      });

    case 'delete':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeLabel', {
        defaultMessage: 'Timing for delete phase',
      });
  }
}
