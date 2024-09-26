/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */
// import { EuiComboBox, EuiFormRow, EuiText } from '@elastic/eui';
// import React from 'react';
// import { FormattedMessage } from '@kbn/i18n-react';
// import { i18n } from '@kbn/i18n';

// export function RuleLinkOptions({
//   onLinkedEntitiesChange,
//   linkedEntities,
// }: {
//   onLinkedEntitiesChange: () => {};
//   linkedEntities: Array<{}>;
// }) {
//   return (
//     <EuiFormRow
//       fullWidth
//       label={i18n.translate('xpack.triggersActionsUI.sections.ruleForm.entitiesFieldLabel', {
//         defaultMessage: 'Entities',
//       })}
//       labelAppend={
//         <EuiText color="subdued" size="xs">
//           <FormattedMessage
//             id="xpack.triggersActionsUI.sections.ruleForm.entitiesFieldOptional"
//             defaultMessage="Optional"
//           />
//         </EuiText>
//       }
//     >
//       <EuiComboBox
//         noSuggestions
//         fullWidth
//         data-test-subj="linkedEntitiesComboBox"
//         selectedOptions={tagsOptions}
//         onCreateOption={(searchValue: string) => {
//           const newOptions = [...tagsOptions, { label: searchValue }];
//           setRuleProperty(
//             'tags',
//             newOptions.map((newOption) => newOption.label)
//           );
//         }}
//         onChange={(selectedOptions: Array<{ label: string }>) => {
//           setRuleProperty(
//             'tags',
//             selectedOptions.map((selectedOption) => selectedOption.label)
//           );
//         }}
//         onBlur={() => {
//           if (!rule.tags) {
//             setRuleProperty('tags', []);
//           }
//         }}
//       />
//     </EuiFormRow>
//   );
// }
