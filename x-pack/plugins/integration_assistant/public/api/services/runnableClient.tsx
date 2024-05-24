import { RemoteRunnable } from '@langchain/core/runnables/remote';

export const newRunnable = (path: string) => {
  const remoteChain = new RemoteRunnable({
    url: `${import.meta.env.VITE_BASE_URL}/api/v1/${path}`,
    options: {
      timeout: 2000000,
      headers: {
        'Access-Control-Allow-Origin': '*.sit.estc.dev',
      },
    },
  });
  return remoteChain;
};
