import { useState } from 'react';
import {
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageSection,
  EuiProvider,
  EuiText,
} from '@elastic/eui';

function App() {
  const [count, setCount] = useState(0);

  return (
    <EuiProvider>
      <EuiPage paddingSize="none">
        <EuiPageBody paddingSize="none">
          <EuiPageSection bottomBorder={'extended'}>
            <EuiPageHeader pageTitle="Standalone Plugin" />
          </EuiPageSection>

          <EuiPageSection color={'plain'} alignment={'top'} grow>
            <EuiText>
              <p>
                This plugin is built using an external pipeline and loaded into Kibana as a
                standalone plugin. It is not part of the Kibana build process.
              </p>
            </EuiText>

            <EuiButton onClick={() => setCount((count) => count + 1)}>count is {count}</EuiButton>
          </EuiPageSection>
        </EuiPageBody>
      </EuiPage>
    </EuiProvider>
  );
}

export default App;
