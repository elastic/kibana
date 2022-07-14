/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiAccordion,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ResponseActionValue } from '../rules/response_action_field';

interface IProps {
  action: ResponseActionValue;
  updateAction: (key: string, value: any, index: number) => void;
  onDeleteAction: () => void;
}

export const ResponseActionTypeForm = React.memo((props: IProps) => {
  const { action, updateAction, onDeleteAction } = props;
  const { osquery } = useKibana().services;
  const [_isOpen, setIsOpen] = useState(true);
  const OsqueryForm = osquery?.OsqueryResponseActionTypeForm;

  console.log({ action });
  const getContent = useMemo(() => {
    // if (action.actionTypeId === 'osquery') {
    return (
      <div>
        <OsqueryForm actionParams={action.params} updateAction={updateAction} item={action} />
      </div>
    );
    // }

    // return <div>different</div>;
  }, [OsqueryForm, action, updateAction]);

  return (
    <EuiAccordion
      initialIsOpen={true}
      key={action.id}
      id={action.id}
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
                <EuiFlexItem grow={false}>{action.actionTypeId}</EuiFlexItem>
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
          // onClick={onDeleteAcction}
          onClick={() => onDeleteAction(action.id)}
        />
      }
    >
      {getContent}
    </EuiAccordion>
  );
});

ResponseActionTypeForm.displayName = 'ResponseActionTypeForm';
