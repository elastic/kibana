import { EuiFlexGroup } from '@elastic/eui';
import ContinueButton from '@Components/Buttons/ContinueButton';
import GoBackButton from '@Components/Buttons/GoBackButton';
import RoutePaths from '@Constants/routePaths';

const ViewResults = () => {
  return (
    <EuiFlexGroup>
      <ContinueButton continuePath={RoutePaths.INTEGRATION_BUILDER_BUILD_PATH} isDisabled={false} currentStep='integrationBuilderStep5' completeStep='integrationBuilderStep4'/>
      <GoBackButton path={RoutePaths.INTEGRATION_BUILDER_RESULTS_PATH} />
    </EuiFlexGroup>
  );
};

export default ViewResults;
