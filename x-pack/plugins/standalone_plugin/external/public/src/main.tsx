import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { KibanaApis, KibanaApisProvider, assertIsKibanaApis } from './KibanaApisProvider.tsx';
import { PageShell } from './PageShell.tsx';

const isKibana = !!document.querySelector('.kbnBody');

if (!isKibana) {
  console.info('Running StandalonePlugin in Standalone Context. No Kibana host detected.');

  const apisMock: KibanaApis = {
    data: {
      search: () => {
        console.info('Mocking Kibana API: data.search()');
      },
    },
  };

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <KibanaApisProvider api={apisMock}>
        <PageShell>
          <App />
        </PageShell>
      </KibanaApisProvider>
    </React.StrictMode>
  );
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).StandalonePlugin = (element: HTMLElement, apis: unknown) => {
    console.info('Mounting StandalonePlugin in Kibana Context');

    assertIsKibanaApis(apis);

    return createRoot(element).render(
      <React.StrictMode>
        <KibanaApisProvider api={apis}>
          <App />
        </KibanaApisProvider>
      </React.StrictMode>
    );
  };
}
