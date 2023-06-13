/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { i18n } from '@kbn/i18n';

interface ActionTypeFieldProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

// const commandLabel = (
//   <>
//     <EuiTitle size={'xxs'}>
//       <EuiText size={'s'}>
//         <FormattedMessage
//           id="xpack.securitySolution.responseActions.endpoint.commentLabel"
//           defaultMessage="Comment (optional)"
//         />
//       </EuiText>
//     </EuiTitle>
//     <EuiSpacer size={'s'} />
//     {/* <EuiText size={'s'}>*/}
//     {/*  <FormattedMessage*/}
//     {/*    id="xpack.securitySolution.responseActions.endpoint.commentDescription"*/}
//     {/*    defaultMessage="Leave a note that explains or describes the action."*/}
//     {/*  />*/}
//     {/* </EuiText>*/}
//     {/* <EuiSpacer size={'s'} />*/}
//   </>
// );

const CONFIG = {
  label: i18n.translate('xpack.securitySolution.responseActions.endpoint.commentLabel', {
    defaultMessage: 'Comment (optional)',
  }),
};

const CommentFieldComponent = ({
  basePath,
  disabled,
  readDefaultValueOnForm,
}: ActionTypeFieldProps) => (
  <UseField
    path={`${basePath}.comment`}
    readDefaultValueOnForm={readDefaultValueOnForm}
    config={CONFIG}
    isDisabled={disabled}
    component={TextField}
  />
);

export const CommentField = React.memo(CommentFieldComponent);
