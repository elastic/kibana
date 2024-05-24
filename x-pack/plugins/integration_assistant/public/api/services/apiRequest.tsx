export const apiPostWithFileResponse = async (
  path: string,
  body: string,
  filename: string,
  customHeaders?: Record<string, string>,
): Promise<File | null> => {
  try {
    const url = `${import.meta.env.VITE_BASE_URL}/api/v1/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*.sit.estc.dev',
        ...customHeaders,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    return new File([blob], filename);
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const apiPost = async (
  path: string,
  body: string | File,
  customHeaders?: Record<string, string>,
): Promise<object | null> => {
  try {
    const url = `${import.meta.env.VITE_BASE_URL}/api/v1/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Control-Allow-Origin': '*.sit.estc.dev',
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const apiGet = async (path: string, customHeaders?: Record<string, string>): Promise<object | null> => {
  try {
    const url = `${import.meta.env.VITE_BASE_URL}/api/v1/${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...customHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (e) {
    console.error(e);
    return null;
  }
};
