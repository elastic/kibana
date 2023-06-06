/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

// import { i18n } from '@kbn/i18n';
// import { FormattedMessage } from '@kbn/i18n-react';
import { roundToDecimalPlace } from '@kbn/ml-number-utils';
import type { TextExpansionInference, FormattedTextExpansionResponse } from '.';

export const getTextExpansionOutputComponent = (inferrer: TextExpansionInference) => (
  <TextExpansionOutput inferrer={inferrer} />
);

export const TextExpansionOutput: FC<{
  inferrer: TextExpansionInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());
  if (!result) {
    return null;
  }

  return (
    <>
      {result
        .sort((a, b) => b.response.score - a.response.score)
        .map(({ response, inputText }) => (
          <>
            <Token response={response} />
            <EuiHorizontalRule />
          </>
        ))}
    </>
  );
};

export const Token: FC<{
  response: FormattedTextExpansionResponse;
}> = ({ response }) => {
  return (
    <>
      {response.text !== undefined ? (
        <>
          {/* <EuiTitle size="xxs"> */}
          <span>
            {response.text}
            {/* <FormattedMessage
                id="xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.title"
                defaultMessage={token}
                values={{ token: inputText }}
              /> */}
          </span>
          {/* </EuiTitle> */}
          <EuiSpacer size="s" />
          {roundToDecimalPlace(response.score)}
        </>
      ) : null}

      {/* <EuiInMemoryTable
        items={response}
        columns={columns}
        pagination={{
          pageSizeOptions: [10, 25, 0],
        }}
      /> */}
    </>
  );
};
// export const TokenList: FC<{
//   response: FormattedTextExpansionResponse;
//   inputText?: string;
// }> = ({ response, inputText }) => {
//   const columns = [
//     {
//       field: 'token',
//       name: i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.token', {
//         defaultMessage: 'Token',
//       }),
//     },
//     {
//       field: 'value',
//       name: i18n.translate('xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.weight', {
//         defaultMessage: 'Weight',
//       }),
//     },
//   ];
//   return (
//     <>
//       {inputText !== undefined ? (
//         <>
//           <EuiTitle size="xxs">
//             <span>
//               <FormattedMessage
//                 id="xpack.ml.trainedModels.testModelsFlyout.textExpansion.output.title"
//                 defaultMessage="Tokens for {token}"
//                 values={{ token: inputText }}
//               />
//             </span>
//           </EuiTitle>
//           <EuiSpacer size="s" />
//         </>
//       ) : null}

//       {/* <EuiInMemoryTable
//         items={response}
//         columns={columns}
//         pagination={{
//           pageSizeOptions: [10, 25, 0],
//         }}
//       /> */}

//     </>
//   );
// };
