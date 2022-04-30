/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import { DrilldownManagerTitle } from '../drilldown_manager_title';
import { useDrilldownManager } from '../context';
import { ActionFactoryView } from '../action_factory_view';
import { DrilldownManagerFooter } from '../drilldown_manager_footer';
import { DrilldownStateForm } from '../drilldown_state_form';
import { ButtonSubmit } from '../../components/button_submit';

const txtEditDrilldown = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.containers.editDrilldownForm.title',
  {
    defaultMessage: 'Edit Drilldown',
    description: 'Drilldowns flyout title for edit drilldown form.',
  }
);

const txtEditDrilldownButton = i18n.translate(
  'xpack.uiActionsEnhanced.drilldowns.containers.editDrilldownForm.primaryButton',
  {
    defaultMessage: 'Save',
    description: 'Primary button on new drilldown edit form.',
  }
);

export interface EditDrilldownFormProps {
  eventId: string;
}

export const EditDrilldownForm: React.FC<EditDrilldownFormProps> = ({ eventId }) => {
  const isMounted = useMountedState();
  const drilldowns = useDrilldownManager();
  const drilldownState = React.useMemo(
    () => drilldowns.createEventDrilldownState(eventId),
    [drilldowns, eventId]
  );
  const [disabled, setDisabled] = React.useState(false);

  if (!drilldownState) return null;

  const handleSave = () => {
    setDisabled(true);
    drilldowns.updateEvent(eventId, drilldownState).finally(() => {
      if (!isMounted()) return;
      setDisabled(false);
    });
  };

  return (
    <>
      <DrilldownManagerTitle>{txtEditDrilldown}</DrilldownManagerTitle>
      <ActionFactoryView
        constant
        factory={drilldownState.factory}
        context={drilldownState.getFactoryContext()}
      />
      {!!drilldownState && <DrilldownStateForm state={drilldownState} disabled={disabled} />}
      {!!drilldownState && (
        <DrilldownManagerFooter>
          <ButtonSubmit disabled={disabled} onClick={handleSave}>
            {txtEditDrilldownButton}
          </ButtonSubmit>
        </DrilldownManagerFooter>
      )}
    </>
  );
};
