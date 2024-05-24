import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { EuiSideNav, EuiIcon } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import RoutePaths from '@Constants/routePaths';

const SideNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selected = useGlobalStore((state) => state.selected);
  const setSelected = useGlobalStore((state) => state.setSelected);
  const selectItem = (name) => {
    setSelected(name);
    navigate(name);
  };
  useEffect(() => {
    if (!selected) {
      setSelected(location.pathname);
    }
  }, []);

  return (
    <EuiSideNav
      items={[
        {
          name: 'Integration Assistant',
          icon: <EuiIcon type="logoElasticsearch" />,
          id: '0',
          href: '/',
          items: [
            {
              name: 'Integration Builder',
              icon: <EuiIcon type="launch" />,
              id: '0.1',
              items: [
                {
                  name: 'ECS Mapping',
                  id: '0.1.0',
                  isSelected: selected === RoutePaths.ECS_MAPPING_PATH,
                  onClick: () => selectItem(RoutePaths.ECS_MAPPING_PATH),
                },
                {
                  name: 'Add Categorization',
                  id: '0.1.1',
                  isSelected: selected === RoutePaths.CATEGORIZATION_PATH,
                  onClick: () => selectItem(RoutePaths.CATEGORIZATION_PATH),
                  href: '#',
                },
                {
                  name: 'Add Related Fields',
                  id: '0.1.2',
                  isSelected: selected === RoutePaths.RELATED_PATH,
                  onClick: () => selectItem(RoutePaths.RELATED_PATH),
                  href: '#',
                },
                {
                  name: 'View Results',
                  id: '0.1.3',
                  isSelected: selected === RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH,
                  onClick: () => selectItem(RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH),
                  href: '#',
                },
                {
                  name: 'Build & Deploy',
                  id: '0.1.4',
                  isSelected: selected === RoutePaths.INTEGRATION_BUILDER_BUILD_PATH,
                  onClick: () => selectItem(RoutePaths.INTEGRATION_BUILDER_BUILD_PATH),
                  href: '#',
                },
              ],
            },
          ],
        },
      ]}
    />
  );
};

export default SideNav;
