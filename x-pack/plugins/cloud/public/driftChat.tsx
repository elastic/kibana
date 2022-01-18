import React, { useEffect, useRef } from 'react';
import type { FC } from 'react';
import ReactDOM from 'react-dom';

const useDriftChatIframe = () => {
  const chatRef = useRef<HTMLIFrameElement>(null);

  const handleChatIframeMessage = (event: MessageEvent): void => {
    const { current: chatIframe } = chatRef;

    if (!chatIframe?.contentWindow || event.source !== chatIframe?.contentWindow) {
      return;
    }

    const { data: message } = event;

    switch (message.type) {
      //case 'driftWidgetReady': {
        //this.startTrackingUserAttributes()
        //break
      //}

      case 'driftIframeReady': {
        const context = {
          window: {
            location: {
              hash: window.location.hash,
              host: window.location.host,
              hostname: window.location.hostname,
              href: window.location.href,
              origin: window.location.origin,
              pathname: window.location.pathname,
              port: window.location.port,
              protocol: window.location.protocol,
              search: window.location.search,
            },
            navigator: {
              language: window.navigator.language,
              userAgent: window.navigator.userAgent,
            },
            innerHeight: window.innerHeight,
            innerWidth: window.innerWidth,
          },
          document: {
            title: document.title,
            referrer: document.referrer,
          },
        }
        const userData = {
          id: 53877975,
          attributes: {
            email: 'sergei.poluektov+drift-chat@elasticsearch.com',
          },
          // this should be fetched from backend
          jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1Mzg3Nzk3NSIsImV4cCI6MTY0MjUxNDc0Mn0.CcAZbD8R865UmoHGi27wKn0aH1bzkZXhX449yyDH2Vk',
        }
        chatIframe.contentWindow.postMessage(
          {
            type: 'driftSetContext',
            data: { context, user: userData },
          },
          '*',
        )
        break
      }

      case 'driftIframeResize': {
        const styles = message.data.styles as Record<string, string>
        Object.entries(styles).forEach(([key, value]) => {
          chatIframe.style.setProperty(key, value)
        })
        break
      }

      default:
        break
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleChatIframeMessage);
    return () => window.removeEventListener('message', handleChatIframeMessage);
  }, []);

  return [chatRef];
};

interface DriftChatProps {
  chatUrl: string;
  appId?: string;
}

const DriftChat: FC<DriftChatProps> = ({ chatUrl, appId }) => {
  const [chatRef] = useDriftChatIframe();

  const initialStyle = {
    position: 'fixed' as const,
    botton: '30px',
    right: '30px',
    display: 'block',
  };

  return (
    <iframe data-test-id='drift-chat' style={initialStyle} ref={chatRef} src={chatUrl} />
  );
};

interface MountParams {
  chatUrl: string;
  appId?: string;
}

export const mount = (params: MountParams) => {
  let element = document.getElementById('drift-chat');
  if (!element) {
    element = document.createElement('div');
    element.id = 'drift-chat';
    document.body.appendChild(element);
  }

  const { chatUrl, appId } = params;

  ReactDOM.render(<DriftChat chatUrl={chatUrl} appId={appId} />, element);
  return () => {
    return ReactDOM.unmountComponentAtNode(element as HTMLElement);
  }
}
