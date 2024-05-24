import { EuiLink } from '@elastic/eui';
import { useNavigate } from 'react-router';

const isModifiedEvent = (event) => !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event) => event.button === 0;

export default function CustomLink({ to, ...props }) {
  const navigate = useNavigate();

  function onClick(event) {
    if (event.defaultPrevented) {
      return;
    }

    // If target prop is set (e.g. to "_blank"), let browser handle link.
    if (event.target.getAttribute('target')) {
      return;
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();
    navigate(to);
  }

  return <EuiLink {...props} href={to} onClick={onClick} />;
}
