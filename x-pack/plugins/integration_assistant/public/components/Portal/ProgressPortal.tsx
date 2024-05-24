import { EuiPortal, EuiProgress } from '@elastic/eui';

const ProgressPortal = () => {
  return (
    <EuiPortal>
      <EuiProgress size="xs" position="fixed" color="accent" />
    </EuiPortal>
  );
};

export default ProgressPortal;
