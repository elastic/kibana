import { useEffect } from 'react';
import { useKibana } from '../../lib/kibana';

export const SecuritySolutionRedirect = ({ path }: { path: string }) => {
  const spacesApi = useKibana().services.spaces;

  useEffect(() => {
    if (spacesApi) {
      spacesApi.ui.redirectLegacyUrl({
        path,
        useToast: true,
        objectNoun: 'path',
      });
    }
  }, [spacesApi]);

  return null;
};
