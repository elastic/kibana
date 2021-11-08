import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { CoreStart } from '../../../../../../src/core/public';
import { BASE_PATH } from '../../../common/constants';

import { SessionView } from '../SessionView';

const testSessionId = '4321';

export const SessionViewPage = (props: RouteComponentProps) => {
  const { chrome, http } = useKibana<CoreStart>().services;
  chrome.setBreadcrumbs([
    {
      text: 'Process Tree',
      href: http.basePath.prepend(`${BASE_PATH}${props.match.path.split('/')[1]}`),
    },
  ]);
  chrome.docTitle.change('Process Tree');

  return (
    <div>
      <SessionView sessionId={testSessionId} />
    </div>
  );
};
