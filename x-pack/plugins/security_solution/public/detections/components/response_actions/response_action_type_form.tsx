/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';

import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { useKibana } from '../../../common/lib/kibana';
import { useFormData, UseField } from '../../../shared_imports';
import type { ArrayItem } from '../../../shared_imports';
import { RESPONSE_ACTION_TYPES } from './constants';

interface IProps {
  item: ArrayItem;
  onDeleteAction: (id: number) => void;
}

const GhostFormField = () => <></>;

export const ResponseActionTypeForm = React.memo((props: IProps) => {
  const { item, onDeleteAction } = props;
  const { osquery } = useKibana().services;
  const [_isOpen, setIsOpen] = useState(true);

  const [data] = useFormData();
  const action = get(data, item.path);

  const getResponseActionTypeForm = useCallback(() => {
    if (action?.actionTypeId === RESPONSE_ACTION_TYPES.OSQUERY) {
      const OsqueryForm = osquery?.OsqueryResponseActionTypeForm;
      if (OsqueryForm) {
        return (
          <div>
            <OsqueryForm updateAction={() => null} item={item} />
          </div>
        );
      }
    }
    // Place for other ResponseActionTypes
    return null;
  }, [action?.actionTypeId, item, osquery?.OsqueryResponseActionTypeForm]);

  const handleDelete = useCallback(() => {
    onDeleteAction(item.id);
  }, [item, onDeleteAction]);

  return (
    <EuiAccordion
      initialIsOpen={true}
      key={item.id}
      id={item.id.toString()}
      onToggle={setIsOpen}
      paddingSize="l"
      className="actAccordionActionForm"
      buttonContentClassName="actAccordionActionForm__button"
      data-test-subj={`alertActionAccordion`}
      buttonContent={
        <EuiFlexGroup gutterSize="l" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type={'logoOsquery'} size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>{action?.actionTypeId}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiButtonIcon
          iconType="minusInCircle"
          color="danger"
          className="actAccordionActionForm__extraAction"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.sections.actionTypeForm.accordion.deleteIconAriaLabel',
            {
              defaultMessage: 'Delete',
            }
          )}
          onClick={handleDelete}
        />
      }
    >
      <UseField
        path={`${item.path}`}
        component={GhostFormField}
        readDefaultValueOnForm={!item.isNew}
      />
      {getResponseActionTypeForm()}
    </EuiAccordion>
  );
});

ResponseActionTypeForm.displayName = 'ResponseActionTypeForm';
