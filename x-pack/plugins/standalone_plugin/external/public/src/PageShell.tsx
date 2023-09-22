import { PropsWithChildren } from 'react';

export const PageShell: React.FC<PropsWithChildren> = ({ children }) => {
  return <div>{children}</div>;
};
