import { EuiButton } from '@elastic/eui';
import { useGlobalStore } from '@Stores/useGlobalStore';
import RoutePaths from '@Constants/routePaths';
import { useNavigate } from 'react-router-dom';

interface GoBackButtonProps {
  path: RoutePaths;
}

const GoBackButton = ({ path }: GoBackButtonProps) => {
  const setSelected = useGlobalStore((state) => state.setSelected);
  const navigate = useNavigate();

  const onGoBackClick = () => {
    setSelected(path);
    navigate(-1);
  };

  return (
    <EuiButton color="warning" aria-label="go-back-button" onClick={onGoBackClick}>
      Go Back
    </EuiButton>
  );
};

export default GoBackButton;
