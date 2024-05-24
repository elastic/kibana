import { EuiPageTemplate } from '@elastic/eui';
import GoBackButton from '@Components/Buttons/GoBackButton';
import RoutePaths from '@Constants/routePaths';

interface EmptyPromptProps {
  title: string;
  description: string;
  goBackPath: RoutePaths;
}

const EmptyPrompt = ({ title, description, goBackPath }: EmptyPromptProps) => {
  return (
    <EuiPageTemplate.EmptyPrompt title={<span>{title}</span>} actions={<GoBackButton path={goBackPath} />}>
      {description}
    </EuiPageTemplate.EmptyPrompt>
  );
};

export default EmptyPrompt;
